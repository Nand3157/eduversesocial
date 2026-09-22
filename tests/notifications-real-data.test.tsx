// @vitest-environment jsdom
/**
 * Logic defect #7: /dashboard/notifications rendered four hardcoded fake
 * notifications (including "LinkedIn account synchronization" in a Meta-only
 * product) with a hardcoded "2 hours ago" on every row. Ground-truth verdict:
 * a real `public.notifications` table EXISTS in the initial migration
 * (workspace-RLS isolated, with type/title/body/read_at columns) but nothing
 * wrote to it. Per scope: wire the real source; do not invent producers.
 *
 * Pinned:
 *   1. the fabricated literals are gone from the page component;
 *   2. NotificationList renders real rows with per-row relative timestamps;
 *   3. an empty table renders the honest empty state (not fabricated items);
 *   4. a load error renders a distinct error alert.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { NotificationList, type NotificationRow } from "@/components/dashboard/notification-list";

const page = readFileSync("app/dashboard/notifications/page.tsx", "utf8");

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
  document.body.innerHTML = "";
});

async function mount(props: { notifications: NotificationRow[]; error?: boolean }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<NotificationList notifications={props.notifications} error={props.error ?? false} />);
  });
}

const rows = (): NotificationRow[] => [
  { id: "n1", type: "engagement", title: "Engagement increased", body: "Real row from the table.", read_at: null, created_at: new Date(Date.now() - 2 * 60_000).toISOString() },
  { id: "n2", type: "system", title: "Older row", body: "Also real.", read_at: new Date().toISOString(), created_at: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString() }
];

describe("notifications real-data contract (logic defect #7)", () => {
  it("1. the fabricated items and hardcoded timestamps are gone from the page", () => {
    // The page is now a server component that renders NotificationList — the
    // hardcoded item array (and its "LinkedIn sync" entry) only existed in the
    // old client page; lucide icons/"use client" prove the old file is gone.
    expect(page).not.toContain("lucide-react");
    expect(page).not.toContain("as const");
    expect(page).not.toContain("outperforming the weekly baseline");
    expect(page).not.toContain("2 hours ago");
    expect(page).not.toContain("Weekly report available");
    // The page reads the real table, ordered, capped.
    expect(page).toContain('.from("notifications")');
    expect(page).toContain('order("created_at", { ascending: false })');
  });

  it("2. real rows render with per-row relative timestamps and unread markers", async () => {
    await mount({ notifications: rows() });
    expect(container!.textContent).toContain("Real row from the table.");
    expect(container!.textContent).toContain("2m ago");
    expect(container!.textContent).toContain("Older row");
    expect(container!.textContent).toMatch(/\d+d ago/);
    // sr-only unread marker only for rows without read_at.
    expect(container!.querySelectorAll(".sr-only")).toHaveLength(1);
  });

  it("3. an empty table shows the honest empty state — no fabricated items", async () => {
    await mount({ notifications: [] });
    expect(container!.textContent).toContain("No notifications yet");
    expect(container!.textContent).not.toContain("LinkedIn");
    expect(container!.textContent).not.toContain("Engagement increased");
  });

  it("4. a load error renders a distinct alert, not fake data", async () => {
    await mount({ notifications: [], error: true });
    const alert = container!.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("couldn't load");
    expect(container!.textContent).not.toContain("Engagement increased");
  });
});
