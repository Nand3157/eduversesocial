import { describe, expect, it } from "vitest";

/**
 * Logic defect #8, part 1 — status-code contract for the reviews APIs.
 *
 * These handlers call Supabase (network) and the rate limiter (lru-cache with
 * timers), so they are not unit-runnable in isolation. The boundary contract
 * is therefore pinned at the source level — the exact branch each failure
 * takes and the status it returns — while the user-visible empty-vs-error
 * behavior is covered behaviorally in tests/reviews-empty-vs-error.test.tsx.
 *
 * Claims ground-truthed before fixing (several audit details did not hold):
 *   - GET /api/reviews DID swallow in-band query errors as `{ reviews: [] }`
 *     with HTTP 200 (only the try/catch returned 503) — REAL, fixed.
 *   - GET's Supabase-not-configured path returned `{ reviews: [] }` 200 —
 *     REAL, now 503 problem response.
 *   - "DELETE in /api/reviews returns 500 on RLS denial" — DOES NOT EXIST:
 *     there is no DELETE export in that file (it uses service role anyway,
 *     which bypasses RLS).
 *   - Admin PATCH wrong id → 500: REAL (PostgREST `.single()` miss is a client
 *     error) — now 404 for PGRST116, 503 for genuine backend faults.
 *   - Admin delete of an unknown id reported `{ success: true }` — REAL
 *     (0-row delete) — now 404 via `count: "exact"`.
 */
import { readFileSync } from "node:fs";

const reviews = readFileSync("app/api/reviews/route.ts", "utf8");
const admin = readFileSync("app/api/admin/reviews/route.ts", "utf8");

const after = (source: string, marker: string) => source.split(marker)[1] ?? "";

describe("GET /api/reviews — outage vs empty (logic defect #8)", () => {
  it("treats in-band query errors as 503, not an empty 200 list", () => {
    const handler = after(reviews, "export async function GET");
    expect(handler).toContain("const { data, error } = await supabase");
    expect(handler).toContain("if (error) {");
    expect(handler.indexOf("if (error) {")).toBeGreaterThan(-1);
    expect(handler).toContain("review_query_failed");
    expect(handler).toContain('problemResponse(503, "REVIEWS_UNAVAILABLE"');
  });

  it("treats Supabase-not-configured as a 503 problem, not an empty list", () => {
    const handler = after(reviews, "export async function GET");
    expect(handler).not.toContain("NextResponse.json({ reviews: [] })");
  });

  it("success is explicit and machine-checkable (success: true)", () => {
    const handler = after(reviews, "export async function GET");
    expect(handler).toContain("success: true");
  });

  it("keeps the transport-level 503 catch", () => {
    const handler = after(reviews, "export async function GET");
    expect(handler).toContain("REVIEWS_UNAVAILABLE");
  });
});

describe("PATCH /api/admin/reviews — correct failure statuses (logic defect #8)", () => {
  it("maps a missing row (PGRST116 from .single()) to 404, not 500", () => {
    const handler = after(admin, "export async function PATCH");
    expect(handler).toContain('error?.code === "PGRST116"');
    expect(handler.split("PGRST116")[1]).toContain("status: 404");
  });

  it("maps genuine update backend faults to 503, and no longer returns 500 for them", () => {
    const handler = after(admin, "export async function PATCH");
    expect(handler).toContain("Could not update the review.");
    expect(handler).toContain("status: 503");
  });

  it("delete reports unknown ids as 404 via exact count instead of fake success", () => {
    const handler = after(admin, "export async function PATCH");
    expect(handler).toContain('delete({ count: "exact" })');
    expect(handler).toContain("if (!count) return");
    expect(handler).toContain("Review not found");
  });

  it("delete backend faults report 503, not 500", () => {
    const handler = after(admin, "export async function PATCH");
    expect(handler).toContain("Could not delete the review.");
  });

  it("keeps the input-validation 400 for malformed moderation requests", () => {
    const handler = after(admin, "export async function PATCH");
    expect(handler).toContain("status: 400");
  });
});
