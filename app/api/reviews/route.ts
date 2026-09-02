import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { clientKey, problemResponse, withRateLimitHeaders } from "@/lib/api-response";

export const runtime = "nodejs";

const reviewSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(800)
});

/**
 * GET — public: returns approved reviews for the landing page. Never requires
 * auth; falls back to an empty list when Supabase is not configured.
 */
export async function GET(request: Request) {
  const limit = 60;
  const rate = await checkRateLimit(clientKey(request, "reviews-read"), limit, 60_000);
  if (!rate.allowed) return withRateLimitHeaders(problemResponse(429, "REVIEWS_RATE_LIMITED", "Review reads are temporarily rate limited.", "Wait for Retry-After seconds, then try again.", request), limit, rate);

  try {
    const supabase = await createClient();
    if (!supabase) return withRateLimitHeaders(NextResponse.json({ reviews: [] }), limit, rate);
    const { data } = await supabase
      .from("reviews")
      .select("id,name,role,rating,content,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(24);
    return withRateLimitHeaders(NextResponse.json({ reviews: data ?? [] }), limit, rate);
  } catch (error) {
    logger.error("review_list_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return withRateLimitHeaders(problemResponse(503, "REVIEWS_UNAVAILABLE", "Approved reviews are temporarily unavailable.", "Retry shortly or continue without review data.", request), limit, rate);
  }
}

/**
 * POST — anyone may submit a review; it is stored as 'pending' for moderation
 * before it ever appears publicly. Rate limited per IP/user to slow spam.
 */
export async function POST(request: Request) {
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  const limit = 5;
  if (!parsed.success) return problemResponse(400, "INVALID_REVIEW", "Review fields are invalid.", "Provide name, rating from 1 to 5, and content under 800 characters.", request);

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    logger.error("review_client_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return problemResponse(503, "REVIEWS_UNAVAILABLE", "Reviews are temporarily unavailable.", "Retry shortly.", request);
  }
  if (!supabase) return problemResponse(503, "REVIEWS_UNAVAILABLE", "Reviews are temporarily unavailable.", "Retry shortly.", request);

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const rate = await checkRateLimit(`review:${user?.id ?? clientKey(request, "review")}`, limit, 60_000);
  if (!rate.allowed) {
    return withRateLimitHeaders(problemResponse(429, "REVIEW_RATE_LIMITED", "Too many review submissions.", "Wait for Retry-After seconds, then try again.", request), limit, rate);
  }

  const { name, role, rating, content } = parsed.data;
  // Use a bare insert (no .select()) — the read RLS only allows `approved` rows,
  // so a `select` after inserting `pending` would be rejected and surface as a
  // 500. The insert itself is gated by the `status='pending'` WITH CHECK policy.
  const { error } = await supabase.from("reviews").insert({
    user_id: user?.id ?? null,
    name,
    role: role?.trim() ? role.trim() : null,
    rating,
    content,
    status: "pending"
  });
  if (error) {
    logger.error("review_insert_failed", { reason: error?.message });
    return withRateLimitHeaders(problemResponse(500, "REVIEW_SAVE_FAILED", "Could not save the review.", "Retry shortly; the review was not published.", request), limit, rate);
  }
  return withRateLimitHeaders(NextResponse.json({ success: true, message: "Thanks for your review! It will appear after moderation." }), limit, rate);
}
