import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Mobile MEDIUM defects #8–#10 — source contracts (media queries don't apply
 * in jsdom, so these pin the implementation strings, same approach as the
 * dock-clearance and mobile-clipping tests).
 *
 * #8  breadcrumb/label truncation (narrow screens)
 * #9  modals not locking body scroll behind them
 * #10 landing/demo footer vs bottom-dock spacing
 */

const read = (p: string) => readFileSync(p, "utf8");

describe("mobile #8 — demo breadcrumb truncation", () => {
  it("the sandbox note is allowed to wrap instead of being clamped at narrow widths", () => {
    const src = read("app/demo/page.tsx");
    // Root cause of the clipping was the breadcrumb row being a nowrap flex
    // line; the note now wraps on its own row.
    expect(src).toMatch(/flex-wrap items-center/);
    // And the row no longer has whitespace-nowrap anywhere in the breadcrumb.
    expect(src).not.toMatch(/whitespace-nowrap/);
  });
});

describe("mobile #9 — modals lock body scroll behind them", () => {
  it("publisher modal and shared Modal build on Radix Dialog (RemoveScroll)", () => {
    const publisher = read("components/meta/meta-publisher-modal.tsx");
    const shared = read("components/ui/modal.tsx");
    expect(publisher).toContain('from "@radix-ui/react-dialog"');
    expect(shared).toContain('from "@radix-ui/react-dialog"');
    // Radix Dialog.Content includes react-remove-scroll; assert the dep exists.
    const pkg = JSON.parse(read("node_modules/@radix-ui/react-dialog/package.json"));
    expect(pkg.dependencies["react-remove-scroll"]).toBeTruthy();
  });

  it("the overlay is a sibling of the scrollable content, not a wrapping container", () => {
    const publisher = read("components/meta/meta-publisher-modal.tsx");
    const shared = read("components/ui/modal.tsx");
    // Anti-pattern that would defeat the lock: a hand-rolled fixed-inset
    // wrapper DIV around the dialog content (the correct pattern has the
    // fixed inset-0 element on Dialog.Overlay/Dialog.Content themselves).
    expect(publisher).not.toMatch(/<div[^>]*className="[^"]*fixed inset-0/);
    expect(shared).not.toMatch(/<div[^>]*className="[^"]*fixed inset-0/);
  });
});

describe("mobile #10 — footer vs bottom-dock spacing", () => {
  it("landing footer keeps dock clearance until the dock hides at lg", () => {
    const src = read("app/page.tsx");
    // pb-40 (160px): the landing dock stacks TWO rows below lg (CTA pills +
    // tab nav, measured 123px in a real browser) — pb-28's 112px left the
    // last footer line ~10px under the dock at 390×844.
    expect(src).toMatch(/landing-footer-shell[^"]*pb-40/);
    expect(src).toMatch(/landing-footer-shell[^"]*(?<!sm:pb-14 )lg:pb-14/);
    // No residual intermediate breakpoint dropping the clearance.
    expect(src).not.toMatch(/sm:pb-14/);
  });

  it("demo main and footer keep dock clearance until the dock hides at md", () => {
    const src = read("app/demo/page.tsx");
    // DemoMobileDock is md:hidden and single-row (~86px measured), so the
    // 112px pb-28 floor must hold through <md.
    expect(src).toMatch(/<main[^>]*pb-28[^"]*md:pb-10/);
    expect(src).toMatch(/<footer[^>]*pb-28[^"]*md:pb-8/);
    expect(src).not.toMatch(/sm:pb-10|sm:pb-8/);
  });
});
