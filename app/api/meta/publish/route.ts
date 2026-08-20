import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { publishToPlatform, safePublishResponse } from "@/lib/social-publisher";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { MetaPostPayload } from "@/lib/meta-api";

const schema = z.object({
  platform: z.enum(["instagram", "facebook", "threads"]),
  mediaType: z.enum(["IMAGE", "VIDEO", "CAROUSEL", "TEXT"]),
  caption: z.string().trim().min(1).max(2200),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  scheduledTime: z.string().optional(),
  targetAccountId: z.string().min(1)
});

/**
 * Rejects payloads that Meta could never publish, as early as possible.
 * Instagram requires media; text-only Threads/Facebook posts must not carry media.
 */
export function validateMedia(input: z.infer<typeof schema>): string | null {
  const media = input.mediaUrls ?? [];
  if (input.platform === "instagram" && (input.mediaType === "TEXT" || media.length === 0)) {
    return "Instagram publishing requires accessible HTTPS media.";
  }
  if (input.mediaType !== "TEXT" && media.length === 0) {
    return `${input.mediaType.toLowerCase()} posts require at least one media URL.`;
  }
  if (input.mediaType === "TEXT" && media.length > 0) {
    return "Text posts cannot include media URLs.";
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Invalid publish payload." }, { status: 400 });
  const invalidMedia = validateMedia(parsed.data);
  if (invalidMedia) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: invalidMedia }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });

  const rate = await checkRateLimit(`publish:${user.id}`, 20, 60_000);
  if (!rate.allowed) return NextResponse.json({ success: false, errorCode: "META_RATE_LIMIT", message: "Too many publish requests. Try again shortly." }, { status: 429 });

  const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member) return NextResponse.json({ success: false, errorCode: "META_ACCOUNT_ERROR", message: "Workspace unavailable." }, { status: 403 });

  const input = parsed.data;
  const { data: account } = await supabase
    .from("social_accounts")
    .select("id,external_id,platform,encrypted_token,token_expires_at,status")
    .eq("workspace_id", member.workspace_id)
    .eq("platform", input.platform)
    .eq("external_id", input.targetAccountId)
    .maybeSingle();
  if (!account?.encrypted_token) return NextResponse.json({ success: false, errorCode: "META_ACCOUNT_ERROR", message: "Selected account is not connected." }, { status: 409 });
  if (account.status === "permission_required") return NextResponse.json({ success: false, errorCode: "META_PERMISSION_ERROR", message: "Reconnect this account to restore its publishing permission." }, { status: 403 });
  if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Meta token expired. Reconnect account." }, { status: 401 });

  // Timezone-aware scheduling: accept ISO-8601 (UTC) values — the client sends
  // the user's local datetime converted to UTC. Past timestamps are rejected.
  if (input.scheduledTime) {
    const scheduled = new Date(input.scheduledTime);
    if (Number.isNaN(scheduled.getTime())) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Scheduled time is not a valid date." }, { status: 400 });
    if (scheduled.getTime() <= Date.now()) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Scheduled time must be in the future." }, { status: 400 });
    const idempotencyKey = `${user.id}:${input.platform}:${input.targetAccountId}:${scheduled.toISOString()}:${input.caption}`;
    const { data: post, error } = await supabase
      .from("scheduled_posts")
      .insert({
        workspace_id: member.workspace_id,
        user_id: user.id,
        platform: input.platform,
        account_id: account.id,
        content: input.caption,
        media: input.mediaUrls || [],
        scheduled_at: scheduled.toISOString(),
        status: "SCHEDULED",
        idempotency_key: idempotencyKey
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const { data: existing } = await supabase.from("scheduled_posts").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing) return NextResponse.json({ success: true, platform: input.platform, postId: existing.id, url: null, publishedAt: null, status: "SCHEDULED" });
    }
    if (error) {
      logger.error("schedule_insert_failed", { userId: user.id, platform: input.platform, reason: error.message });
      return NextResponse.json({ success: false, errorCode: "META_API_ERROR", message: "Could not schedule post." }, { status: 500 });
    }
    return NextResponse.json({ success: true, platform: input.platform, postId: post.id, url: null, publishedAt: null, status: "SCHEDULED" });
  }

  try {
    const token = decrypt(account.encrypted_token);
    const payload: MetaPostPayload = {
      platform: input.platform,
      mediaType: input.mediaType,
      caption: input.caption,
      mediaUrls: input.mediaUrls || [],
      targetAccountId: account.external_id
    };
    const result = await publishToPlatform(payload, token);
    return NextResponse.json(result);
  } catch (error) {
    const safe = safePublishResponse(error, input.platform);
    logger.error("publish_failed", { userId: user.id, platform: input.platform, errorCode: safe.errorCode });
    if (safe.errorCode === "META_PERMISSION_ERROR") {
      safe.message = `${safe.message} Grant publish access (pages_manage_posts for Pages, instagram_content_publish for Instagram) under App Review → Permissions and Features in the Meta developer dashboard, then reconnect the account.`;
    }
    const status = safe.errorCode === "META_AUTH_ERROR" ? 401 : safe.errorCode === "META_PERMISSION_ERROR" ? 403 : safe.errorCode === "META_RATE_LIMIT" ? 429 : safe.errorCode === "META_INVALID_MEDIA" ? 400 : 502;
    return NextResponse.json(safe, { status });
  }
}
