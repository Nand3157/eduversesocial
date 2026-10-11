// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { AnalyticsProvider } from "@/components/dashboard/analytics-context";
import { ContentCalendar } from "@/components/dashboard/content-calendar";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

const accounts = [
  { id: "page_1", name: "Nissan r34", platform: "facebook", handle: "Nissan r34", status: "active", connectedAt: "2026-01-01T00:00:00Z" },
  { id: "page_2", name: "Second Page", platform: "facebook", handle: "Second Page", status: "active", connectedAt: "2026-01-01T00:00:00Z" }
];

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/meta/calendar")) return Promise.resolve(response({ message: "Could not load calendar posts or recurring slots." }, false, 500));
      if (url === "/api/meta/connect") return Promise.resolve(response({ success: true, accounts }));
      return Promise.resolve(response({}));
    }
  });
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false
  });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
  document.body.innerHTML = "";
});

describe("content calendar independent data fallbacks", () => {
  it("keeps published history and connected accounts available when scheduling data fails", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const snapshot = {
      success: true,
      live: true,
      accounts: [],
      recentPosts: [{
        id: "page_1_post_1",
        platform: "Facebook Pages",
        post: "Published before scheduling was configured",
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        likes: "2", comments: "0", shares: "0", reach: "—", status: "Live",
        timestamp: new Date().toISOString(), permalink: "https://example.com/post", accountId: "account_db_id"
      }]
    } as unknown as AnalyticsSnapshot;

    await act(async () => {
      root!.render(<AnalyticsProvider initialData={snapshot}><ContentCalendar /></AnalyticsProvider>);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("Published before scheduling was configured");
    expect(container.textContent).toContain("Could not load calendar posts or recurring slots.");

    const recurringButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Recurring slot"));
    expect(recurringButton).toBeTruthy();
    await act(async () => recurringButton!.click());

    const accountSelect = document.body.querySelector<HTMLSelectElement>('select[aria-label="Connected account"]');
    expect(accountSelect?.options.length).toBe(3);
    expect(accountSelect?.value).toBe("page_1");
    await act(async () => {
      accountSelect!.value = "page_2";
      accountSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(accountSelect?.value).toBe("page_2");
  });
});
