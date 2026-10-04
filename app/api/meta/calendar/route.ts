import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { matchesRecurringSlot } from "@/lib/recurring-slots";

const platforms = ["instagram", "facebook", "threads"] as const;
const slotSchema = z.object({
  accountId: z.string().min(1),
  platform: z.enum(platforms),
  label: z.string().trim().min(1).max(100),
  weekday: z.number().int().min(0).max(6),
  localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(1).max(80),
  contentType: z.enum(["IMAGE", "VIDEO", "CAROUSEL", "TEXT"]),
  approvalRequired: z.boolean().default(true)
});

async function getContext() {
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ message: "Sign in required." }, { status: 401 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Sign in required." }, { status: 401 }) };
  const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member) return { error: NextResponse.json({ message: "Workspace unavailable." }, { status: 403 }) };
  return { supabase, user, workspaceId: member.workspace_id };
}

export async function GET(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) >= Date.parse(end)) {
    return NextResponse.json({ message: "A valid calendar date range is required." }, { status: 400 });
  }
  const [posts, slots] = await Promise.all([
    context.supabase.from("scheduled_posts").select("id,platform,content,media,scheduled_at,status,approval_status,account_id,social_accounts!inner(display_name,username,handle)")
      .eq("workspace_id", context.workspaceId).eq("user_id", context.user.id).gte("scheduled_at", start).lt("scheduled_at", end).order("scheduled_at"),
    context.supabase.from("recurring_content_slots").select("id,account_id,platform,label,weekday,local_time,timezone,content_type,approval_required,enabled")
      .eq("workspace_id", context.workspaceId).eq("user_id", context.user.id).eq("enabled", true)
  ]);
  if (posts.error || slots.error) return NextResponse.json({ message: "Could not load the calendar." }, { status: 500 });
  return NextResponse.json({ posts: posts.data ?? [], slots: slots.data ?? [] });
}

export async function POST(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;
  const parsed = slotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid recurring slot." }, { status: 400 });
  try { new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone }); }
  catch { return NextResponse.json({ message: "Choose a valid timezone." }, { status: 400 }); }
  const { accountId: externalAccountId, localTime, approvalRequired, contentType, ...rest } = parsed.data;
  const { data: account } = await context.supabase.from("social_accounts").select("id")
    .eq("workspace_id", context.workspaceId).eq("external_id", externalAccountId).eq("platform", parsed.data.platform).maybeSingle();
  if (!account) return NextResponse.json({ message: "That connected account could not be found." }, { status: 404 });
  const { data, error } = await context.supabase.from("recurring_content_slots").insert({
    ...rest, account_id: account.id, user_id: context.user.id, workspace_id: context.workspaceId,
    local_time: localTime, approval_required: approvalRequired, content_type: contentType
  }).select("id").single();
  if (error) return NextResponse.json({ message: "Could not save the recurring slot." }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;
  const parsed = z.object({ id: z.string().uuid(), scheduledAt: z.string().datetime().optional(), approvalStatus: z.enum(["pending", "approved", "rejected"]).optional() })
    .refine((value) => value.scheduledAt || value.approvalStatus).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid calendar update." }, { status: 400 });
  if (parsed.data.scheduledAt && Date.parse(parsed.data.scheduledAt) <= Date.now()) return NextResponse.json({ message: "Scheduled time must be in the future." }, { status: 400 });
  const update: Record<string, string> = {};
  if (parsed.data.scheduledAt) update.scheduled_at = parsed.data.scheduledAt;
  if (parsed.data.approvalStatus) update.approval_status = parsed.data.approvalStatus;
  if (parsed.data.scheduledAt && !parsed.data.approvalStatus) {
    const { data: current } = await context.supabase.from("scheduled_posts").select("account_id")
      .eq("id", parsed.data.id).eq("workspace_id", context.workspaceId).eq("user_id", context.user.id).eq("status", "SCHEDULED").maybeSingle();
    if (!current) return NextResponse.json({ message: "Scheduled post not found or no longer editable." }, { status: 404 });
    const { data: slots } = await context.supabase.from("recurring_content_slots").select("weekday,local_time,timezone,approval_required")
      .eq("workspace_id", context.workspaceId).eq("account_id", current.account_id).eq("enabled", true).eq("approval_required", true);
    if ((slots ?? []).some((slot) => matchesRecurringSlot(parsed.data.scheduledAt!, slot))) update.approval_status = "pending";
  }
  const { data, error } = await context.supabase.from("scheduled_posts").update(update)
    .eq("id", parsed.data.id).eq("workspace_id", context.workspaceId).eq("user_id", context.user.id).eq("status", "SCHEDULED").select("id").maybeSingle();
  if (error) return NextResponse.json({ message: "Could not update the scheduled post." }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Scheduled post not found or no longer editable." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid recurring slot." }, { status: 400 });
  const { data, error } = await context.supabase.from("recurring_content_slots").update({ enabled: false })
    .eq("id", parsed.data.id).eq("workspace_id", context.workspaceId).eq("user_id", context.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ message: "Could not remove the slot." }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Recurring slot not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
