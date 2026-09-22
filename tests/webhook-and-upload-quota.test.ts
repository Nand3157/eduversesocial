import { describe, expect, it } from "vitest";

/**
 * Logic inventory #6 and #10, ground-truthed then fixed.
 *
 * #6 VERDICT — DOES NOT REPRODUCE (fabricated inventory item). The audit
 * claimed `app/api/meta/hook/route.ts` is a Meta webhook ingest endpoint that
 * "counts ingested events before validating, and only counts feed events". In
 * reality that file is the AI Hook Generator (draft + images → Gemini hook
 * suggestions): no ingest counter, no event types, no metrics side effects.
 * The codebase contains no webhook receiver at all — `lib/agentic/api-catalog.ts`
 * explicitly excludes "Meta webhook receivers" from this app. There is nothing
 * to fix; adding an ingest endpoint would be a new feature, out of scope.
 * Test 1 pins that verdict so it can't silently regress into existence.
 *
 * #10 VERDICT — REPRODUCES, in three parts:
 *   (units)   the "storage quota" counted `scheduled_posts` rows against an
 *             image-upload limit — 1000 text-only posts locked users out of
 *             uploading while never storing a byte;
 *   (hole)    the comment promised "full storage quota checked via
 *             storage.list head" but never implemented it, so orphaned media
 *             (uploads never attached to a post leave no DB row) grew
 *             unbounded — the exact 200GB-overnight vector claimed guarded;
 *   (design)  failed attempts consuming the 15/min rate limit is consistent
 *             anti-abuse behavior across all routes — by design, left alone.
 * Fix: quota now counts the user's actual stored objects via storage.list
 * (matching units, orphans included) with a fail-open listing (the daily
 * rate limit remains the anti-loop guard), replacing the row count.
 */
import { readFileSync } from "node:fs";

const upload = readFileSync("app/api/meta/upload/route.ts", "utf8");
const hook = readFileSync("app/api/meta/hook/route.ts", "utf8");
const catalog = readFileSync("lib/agentic/api-catalog.ts", "utf8");

describe("#6 webhook ingest accounting — verdict: does not reproduce", () => {
  it("no webhook ingest endpoint exists anywhere to mis-account", () => {
    // The hook route is the Gemini hook generator, not a Meta webhook receiver.
    expect(hook).toContain("Write exactly");
    expect(hook).toContain("GoogleGenAI");
    expect(hook).not.toMatch(/X-Hub-Signature|x-hub-signature|hub\.mode|hub\.topic/i);
    // No ingest counter exists in any server route.
    for (const file of [upload, hook, catalog]) {
      expect(file).not.toContain("ingested");
    }
    // And the API catalog documents that webhook receivers are out of this app.
    expect(catalog).toContain("webhook");
  });
});

describe("#10 upload quota — units fixed to storage objects", () => {
  it("quota counts stored media objects (storage.list), not scheduled_posts rows", () => {
    expect(upload).toContain('from("post-media")');
    expect(upload).toContain(".list(`uploads/${user.id}`");
    expect(upload).not.toContain('.from("scheduled_posts")'); // row-count proxy removed
    expect(upload).not.toContain('.from("workspace_members")'); // only existed for that proxy
    expect(upload).toContain("UPLOAD_FILE_QUOTA");
  });

  it("listing failure fails open (rate limits remain the anti-loop guard)", () => {
    expect(upload).toContain("listError");
    // The quota return is guarded by !listError — an outage can't lock users out.
    expect(upload).toMatch(/if \(!listError && objects && objects\.length >= UPLOAD_FILE_QUOTA\)/);
  });

  it("quota message describes file storage, not posts; still 429 with the limits upstream", () => {
    expect(upload).toContain("Upload storage limit reached");
    expect(upload).not.toContain("Workspace limit reached");
    // Enforcement order intact: schema → auth → rate limits → quota → decode.
    const order = [
      upload.indexOf('message: "Too many uploads.'),
      upload.indexOf("Daily upload limit reached"),
      upload.indexOf("Upload storage limit reached"),
      upload.indexOf('message: "Invalid image data."')
    ];
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
