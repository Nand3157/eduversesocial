import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Admin reviews endpoint — requires an authenticated session. Uses the
 * service-role client to read/update regardless of the public `reviews` RLS
 * (which only allows `approved` reads and `pending` inserts for anon).
 *
 * This is the moderation queue that was requested after switching `POST
 * /api/reviews` to `pending`-only: pending rows are invisible on the landing
 * page until a signed-in user approves them here.
 */

function serviceOr503() {
  if (!hasServiceConfig()) {
    return NextResponse.json({ error: "Review moderation is not configured. Set SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }
  const client = createServiceClient();
  if (!client) return NextResponse.json({ error: "Review moderation is not configured." }, { status: 503 });
  return client;
}

async function requireAuth() {
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ error: "Authentication is not configured." }, { status: 503 }), user: null as null };
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }), user: null as null };
  return { user, error: null as null };
}

/**
 * GET — list reviews for moderation. Query params:
 *   ?status=pending|approved|rejected|all  (default pending)
 *   ?limit=1..100                           (default 50)
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 50;

  if (!(await checkRateLimit(`admin-reviews:get:${auth.user!.id}`, 60, 60_000)).allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const service = serviceOr503();
  if (service instanceof NextResponse) return service;

  const allowed: Record<string, string | null> = { pending: "pending", approved: "approved", rejected: "rejected", all: null };
  if (!(status in allowed)) return NextResponse.json({ error: "Invalid status. Use pending, approved, rejected, or all." }, { status: 400 });

  let query = service
    .from("reviews")
    .select("id,name,role,rating,content,status,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  const filter = allowed[status];
  if (filter) query = query.eq("status", filter);

  const { data, error } = await query;
  if (error) {
    logger.error("admin_reviews_list_failed", { reason: error.message });
    return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });
  }

  const counts = await service.from("reviews").select("status").then(({ data: rows }) => {
    const c: Record<string, number> = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const row of (rows ?? []) as Array<{ status: string }>) {
      c.total += 1;
      if (row.status in c) c[row.status] += 1;
    }
    return c;
  });

  return NextResponse.json({ reviews: data ?? [], counts, status: filter ?? "all" }, { headers: { "Cache-Control": "no-store" } });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "pending", "delete"])
});

/**
 * PATCH — moderate a single review.
 *   { id, action: "approve" | "reject" | "pending" | "delete" }
 * `delete` hard-deletes the row (useful for spam).
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request. Provide id and action (approve | reject | pending | delete)." }, { status: 400 });

  if (!(await checkRateLimit(`admin-reviews:patch:${auth.user!.id}`, 30, 60_000)).allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const service = serviceOr503();
  if (service instanceof NextResponse) return service;

  const { id, action } = parsed.data;

  if (action === "delete") {
    const { error } = await service.from("reviews").delete().eq("id", id);
    if (error) {
      logger.error("admin_review_delete_failed", { reason: error.message, id });
      return NextResponse.json({ error: "Could not delete the review." }, { status: 500 });
    }
    return NextResponse.json({ success: true, id, status: "deleted" });
  }

  const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
  const { data, error } = await service.from("reviews").update({ status: nextStatus }).eq("id", id).select("id,status").single();
  if (error || !data) {
    logger.error("admin_review_update_failed", { reason: error?.message, id, action });
    return NextResponse.json({ error: "Could not update the review. Check the id." }, { status: 500 });
  }
  return NextResponse.json({ success: true, review: data });
}
