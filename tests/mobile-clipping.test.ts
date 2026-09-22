import { describe, expect, it } from "vitest";

/**
 * Mobile clipping cluster (#4–#7). Media queries don't apply in jsdom (no real
 * layout), so the responsive contract is pinned at the source level — same
 * approach as tests/dock-clearance.test.ts.
 *
 * Ground-truthed claims, all four reproduced:
 *  (a) demo header row ≈450px and privacy row ≈490px of always-visible
 *      content vs ~360px viewport → right button clipped under the
 *      (removed-on-mobile) overflow mask. Fixed: labels/wordmark hidden <sm.
 *  (b) publisher `grid-cols-2` held a datetime-local (~180–220px intrinsic) →
 *      horizontal overflow at 360px. Fixed: grid-cols-1 below sm.
 *  (c) inputs at text-xs/sm (12/14px) → iOS Safari auto-zoom on focus.
 *      Fixed: 16px floor on form controls ≤640px.
 *  (d) body overflow-x: hidden (base + ≤768 duplicate) masked causes. Fixed:
 *      removed both; base rule now `clip` with justification.
 */
import { readFileSync } from "node:fs";

const globals = readFileSync("app/globals.css", "utf8");
const demo = readFileSync("app/demo/page.tsx", "utf8");
const privacy = readFileSync("app/privacy/page.tsx", "utf8");
const publisher = readFileSync("components/meta/meta-publisher-modal.tsx", "utf8");

describe("mobile clipping cluster (#4–#7)", () => {
  it("(a) demo header: labels collapse below sm, with accessible names kept", () => {
    expect(demo).toContain('<span className="hidden sm:inline">Back to site</span>');
    expect(demo).toContain('aria-label="Back to site"');
    expect(demo).toContain('className="hidden font-display text-lg font-semibold tracking-tight text-ink sm:inline"');
    // ≥sm the visible label is back (unchanged desktop).
    expect(demo).toMatch(/sm:inline">Back to site/);
  });

  it("(a) privacy header: both buttons collapse below sm with aria-labels", () => {
    expect(privacy).toContain('<span className="hidden sm:inline">Explore demo</span>');
    expect(privacy).toContain('<span className="hidden sm:inline">Back to site</span>');
    expect(privacy).toContain('aria-label="Explore demo"');
    expect(privacy).toContain('aria-label="Back to site"');
  });

  it("(b) publisher format/schedule grid stacks below sm", () => {
    expect(publisher).toContain("grid grid-cols-1 gap-4 sm:grid-cols-2");
    expect(publisher).not.toContain('className="grid grid-cols-2 gap-4"');
  });

  it("(c) form controls get a 16px floor on ≤640px (no iOS focus zoom)", () => {
    // `!important` is load-bearing: utility classes (.text-sm/.text-xs)
    // out-specificity a bare element selector, so the original non-important
    // rule computed 14px in a real browser despite passing this test.
    const rule = "input:not([type='hidden']), textarea, select { font-size: 16px !important; }";
    expect(globals).toContain(rule);
    // …and it lives inside the second (mobile) max-width: 640px block, after
    // the first (landing) block — placement matters, not just presence.
    const second640 = globals.indexOf("@media (max-width: 640px)", globals.indexOf("@media (max-width: 640px)") + 1);
    expect(second640).toBeGreaterThan(-1);
    expect(globals.indexOf(rule)).toBeGreaterThan(second640);
    expect(globals.indexOf("}", globals.indexOf(rule))).toBeLessThan(globals.length);
  });

  it("(d) body no longer masks overflow with hidden; the mobile duplicate is gone", () => {
    expect(globals).toContain("overflow-x: clip;");
    expect(globals).not.toContain("overflow-x: hidden");
    expect(globals).not.toMatch(/body \{ overflow-x:/); // no per-breakpoint override
    // Justification lives in the comment directly above the rule.
    const clipAt = globals.indexOf("overflow-x: clip;");
    const comment = globals.slice(Math.max(0, clipAt - 600), clipAt);
    expect(comment).toContain("scroll container");
    expect(comment).toContain("ornaments");
  });
});
