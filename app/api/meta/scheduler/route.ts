import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { processDueMetaPosts } from "@/lib/meta-scheduler";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Scheduler worker endpoint. Guarded by SCHEDULER_SECRET and executed with a
 * service-role client because cron requests carry no user session and row-level
 * security would otherwise block every read and write. Vercel Cron injects
 * `Authorization: Bearer $CRON_SECRET` automatically, so CRON_SECRET is
 * accepted as an alias for SCHEDULER_SECRET. The endpoint fails closed: when
 * neither secret is configured it refuses to run instead of serving
 * service-role work to unauthenticated callers.
 */
export async function POST(request: Request) {
  const secret = process.env.SCHEDULER_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    logger.error("scheduler_secret_missing");
    return NextResponse.json({ error: "Scheduler is not configured." }, { status: 503 });
  }
  // Timing-safe compare so the guard cannot be probed byte-by-byte via timing.
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`scheduler:${ip}`, 10, 60_000)).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const supabase = createServiceClient();
  if (!supabase || !hasServiceConfig()) return NextResponse.json({ error: "Scheduler database access is not configured. Set SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  return NextResponse.json(await processDueMetaPosts(supabase));
}

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["cancel", "reschedule"]),
  scheduledAt: z.string().optional()
});

/**
 * Authenticated user management of their own scheduled posts:
 * cancel an SCHEDULED/DRAFT post, or move it to a new future time.
 */
export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Invalid request." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Authentication is not configured." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });

  const { data: post } = await supabase
    .from("scheduled_posts")
    .select("id,status,scheduled_at,workspace_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!post) return NextResponse.json({ success: false, errorCode: "META_ACCOUNT_ERROR", message: "Scheduled post not found." }, { status: 404 });
  const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).eq("workspace_id", post.workspace_id).maybeSingle();
  if (!member) return NextResponse.json({ success: false, errorCode: "META_ACCOUNT_ERROR", message: "You do not have access to this post." }, { status: 403 });
  if (post.status === "PUBLISHED" || post.status === "PUBLISHING" || post.status === "FAILED") {
    return NextResponse.json({ success: false, errorCode: "META_ACCOUNT_ERROR", message: `A ${post.status.toLowerCase()} post cannot be changed.` }, { status: 409 });
  }

  if (parsed.data.action === "cancel") {
    const { error } = await supabase.from("scheduled_posts").update({ status: "CANCELLED", updated_at: new Date().toISOString() }).eq("id", parsed.data.id);
    if (error) return NextResponse.json({ success: false, errorCode: "META_API_ERROR", message: "Could not cancel the post." }, { status: 500 });
    return NextResponse.json({ success: true, id: parsed.data.id, status: "CANCELLED" });
  }

  if (!parsed.data.scheduledAt) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "A new scheduled time is required." }, { status: 400 });
  const scheduled = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Scheduled time is not a valid date." }, { status: 400 });
  if (scheduled.getTime() <= Date.now()) return NextResponse.json({ success: false, errorCode: "META_INVALID_MEDIA", message: "Scheduled time must be in the future." }, { status: 400 });
  const { error } = await supabase.from("scheduled_posts").update({ status: "SCHEDULED", scheduled_at: scheduled.toISOString(), updated_at: new Date().toISOString() }).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ success: false, errorCode: "META_API_ERROR", message: "Could not reschedule the post." }, { status: 500 });
  return NextResponse.json({ success: true, id: parsed.data.id, status: "SCHEDULED", scheduledAt: scheduled.toISOString() });
}
