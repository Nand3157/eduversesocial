import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ reviews: [] });
  const { data } = await supabase
    .from("reviews")
    .select("id,name,role,rating,content,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);
  return NextResponse.json({ reviews: data ?? [] });
}

/**
 * POST — anyone may submit a review, but it is stored as 'pending' and only
 * shows publicly once approved. Rate limited per IP to slow spam.
 */
export async function POST(request: Request) {
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review. Check the fields and try again." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Reviews are unavailable right now." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const clientKey = user?.id ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  if (!(await checkRateLimit(`review:${clientKey}`, 5, 60_000)).allowed) {
    return NextResponse.json({ error: "Too many submissions. Try again in a minute." }, { status: 429 });
  }

  const { name, role, rating, content } = parsed.data;
  const { error } = await supabase.from("reviews").insert({
    user_id: user?.id ?? null,
    name,
    role: role?.trim() ? role.trim() : null,
    rating,
    content,
    status: "pending"
  });
  if (error) {
    logger.error("review_insert_failed", { reason: error.message });
    return NextResponse.json({ error: "Could not save the review." }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: "Review submitted. It will appear here once approved." });
}