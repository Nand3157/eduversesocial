/**
 * Mobile defect #3: the fixed dashboard dock is `lg:hidden` (~69px + safe-area),
 * but the shell reserved only `sm:pb-6` from 640px and dashboard-home removed
 * its buffer at `md` — so between 640–1023px (and at md on home) bottom content
 * sat under the dock. The chosen rule: the dock hides at `lg`, so clearance
 * reserves dock-height + safe-area for the whole <lg band, everywhere.
 *
 * This is a source-contract test (jsdom applies no media queries, and the shell
 * needs Next server hooks to mount), so it pins the class strings the rule is
 * implemented with — including the chat column's per-band heights, which must
 * subtract that clearance to keep mobile defect #2's "page never scrolls"
 * contract intact.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const shell = read("components/dashboard/app-shell.tsx");
const nav = read("components/ui/mobile-bottom-nav.tsx");
const home = read("components/dashboard/dashboard-home.tsx");
const chat = read("components/dashboard/chat-interface.tsx");

const CLEARANCE = "calc(80px_+_env(safe-area-inset-bottom))";

describe("bottom dock clearance (mobile defect #3)", () => {
  it("dashboard dock hides at lg and accounts for the safe area", () => {
    const dashboardDock = nav.split("export function DashboardMobileDock")[1];
    expect(dashboardDock).toContain("lg:hidden");
    expect(dashboardDock).toContain("env(safe-area-inset-bottom)");
  });

  it("shell reserves dock-height + safe-area for base AND sm, falling back only at lg", () => {
    const main = shell.split('id="main-content"')[1].slice(0, 260);
    // Base (<640) and sm (640–1023) both reserve the dock zone…
    expect(main).toContain(`pb-[${CLEARANCE}]`);
    expect(main).toContain(`sm:pb-[${CLEARANCE}]`);
    // …and only at lg, where the dock is gone, normal padding returns.
    expect(main).toContain("lg:pb-8");
    // The old under-reservations are gone.
    expect(main).not.toContain("sm:pb-6");
    expect(main).not.toContain("pb-24");
  });

  it("dashboard-home keeps its bottom buffer through the whole dock band (lg, not md)", () => {
    expect(home).toContain("pb-6 lg:pb-0");
    expect(home).not.toContain("md:pb-0");
  });

  it("every dashboard page inherits the clearance (no page-level pb overrides)", () => {
    // Pages under app/dashboard must not fight the shell's reservation.
    const pages = [
      "app/dashboard/analytics/page.tsx",
      "app/dashboard/chat/page.tsx",
      "app/dashboard/content/page.tsx",
      "app/dashboard/integrations/page.tsx",
      "app/dashboard/memory/page.tsx",
      "app/dashboard/notifications/page.tsx",
      "app/dashboard/recommendations/page.tsx",
      "app/dashboard/reviews/page.tsx",
      "app/dashboard/settings/page.tsx"
    ];
    for (const page of pages) {
      expect(read(page)).not.toMatch(/pb-\d|:pb-\d/);
    }
  });

  it("chat column subtracts the reserved clearance per band (keeps mobile #2 no-scroll contract)", () => {
    expect(chat).toContain("h-[calc(100dvh_-_160px_-_env(safe-area-inset-bottom))]"); // base: 64 header + 16 pt + clearance
    expect(chat).toContain("sm:h-[calc(100dvh_-_168px_-_env(safe-area-inset-bottom))]"); // sm: 64 + 24 pt + clearance
    expect(chat).toContain("lg:h-[calc(100dvh-150px)]"); // desktop unchanged
  });

  it("the demo surface stays on its own self-consistent md rule", () => {
    // Demo dock is md:hidden with matching pb-24 md:pb-0 — not part of the
    // dashboard rule, but asserted so the two conventions can't silently drift.
    expect(nav.split("export function DemoMobileDock")[1]).toContain("md:hidden");
    expect(read("components/demo/demo-dashboard.tsx")).toContain("pb-24 md:pb-0");
  });
});
