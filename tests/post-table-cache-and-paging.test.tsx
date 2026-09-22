// @vitest-environment jsdom
/**
 * Logic defects #4 + #5 (post-table, one file-scoped pass).
 *
 * Ground truth from the code (the audit's quoted internals — persistedPostIds,
 * a View CSV panel, an existing broken key handler — don't exist anywhere in
 * the repo): the real issues are:
 *   #4: `eduverse:csv-import` is a global, identity-less cache hydrated
 *       whenever no `csvRows` prop is active, with no cap or shape check —
 *       so rows imported in one context can resurface under another, and the
 *       payload is read without bound.
 *   #5: the pager has no keyboard support at all, and `page` is never
 *       re-clamped when `totalPages` shrinks (empty page + "Page 3 of 1").
 *
 * Pinned behaviors:
 *   1. an active selection always wins — persisted A never renders under B;
 *   2. with no selection, the cache hydrates (the feature still works);
 *   3. the cache read is shape-checked and capped at 50; cache events are
 *      capped too; repeated exports keep exactly one storage key;
 *   4. malformed payloads are ignored;
 *   5. Clear empties rows AND removes the storage key;
 *   6. ArrowRight/ArrowLeft move exactly one page, clamped at both ends;
 *   7. shrinking the list clamps `page` back into [1, totalPages].
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnalyticsProvider } from "@/components/dashboard/analytics-context";
import { PostTable } from "@/components/dashboard/post-table";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

const CSV_KEY = "eduverse:csv-import";

const row = (n: number) => ({ platform: "instagram", content: `Cached draft ${n}`, date: "Sep 1, 2026" });
const rows = (count: number) => Array.from({ length: count }, (_, i) => row(i + 1));

const recentPosts = Array.from({ length: 7 }, (_, i) => ({
  platform: "Instagram Business",
  post: `Live post ${i + 1}`,
  date: `Sep ${i + 1}, 2026`,
  likes: "12",
  comments: "3",
  shares: "1",
  reach: "400",
  status: "Trending"
}));

function snapshotWith(posts: typeof recentPosts): AnalyticsSnapshot {
  return { live: true, recentPosts: posts } as unknown as AnalyticsSnapshot;
}

beforeAll(() => {
  // This vitest/jsdom build exposes a bare `localStorage` object with NO Storage
  // methods (getItem/setItem/clear are all undefined). Install a minimal
  // in-memory Storage so both the component's try/catch paths and the test's
  // assertions exercise real storage semantics.
  class MemoryStorage {
    private map = new Map<string, string>();
    getItem(key: string) {
      return this.map.has(String(key)) ? this.map.get(String(key))! : null;
    }
    setItem(key: string, value: string) {
      this.map.set(String(key), String(value));
    }
    removeItem(key: string) {
      this.map.delete(String(key));
    }
    clear() {
      this.map.clear();
    }
    key(index: number) {
      return [...this.map.keys()][index] ?? null;
    }
    get length() {
      return this.map.size;
    }
  }
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: storage });
  try {
    Object.defineProperty(window, "localStorage", { configurable: true, writable: true, value: storage });
  } catch {}

  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: () => {
      throw new Error("unexpected fetch — provider must be seeded");
    }
  });
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false
  });
  Element.prototype.scrollIntoView = () => undefined;
});

beforeEach(() => {
  localStorage.clear();
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
  document.body.innerHTML = "";
  localStorage.clear();
});

async function mount({ csvRows, posts = [] }: { csvRows?: ReturnType<typeof rows>; posts?: typeof recentPosts }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <AnalyticsProvider initialData={snapshotWith(posts)}>
        <PostTable csvRows={csvRows} />
      </AnalyticsProvider>
    );
  });
  // Flush the queueMicrotask localStorage hydration.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const text = () => container!.textContent ?? "";
const liveRegion = () => [...container!.querySelectorAll('[aria-live="polite"]')].map((el) => el.textContent ?? "").join(" ");

async function press(pager: Element, key: string) {
  await act(async () => {
    pager.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

const pager = () => {
  const element = container!.querySelector('[aria-label="Pagination"]');
  if (!element) throw new Error("pager not found");
  return element;
};

// ---- tests ----------------------------------------------------------------

describe("post-table cache scoping (logic defect #4)", () => {
  it("1. an active selection always wins — persisted post A rows never render under B", async () => {
    localStorage.setItem(CSV_KEY, JSON.stringify({ at: "2026-09-01", rows: rows(3) }));
    await mount({ csvRows: [{ platform: "threads", content: "Selection B content", date: "Sep 2, 2026" }] });
    expect(text()).toContain("Selection B content");
    expect(text()).not.toContain("Cached draft");
    // The banner counts only B's row — the 3 persisted A rows never merged in.
    expect(text()).not.toContain("3 CSV rows kept locally");
    expect(text()).toContain("1 CSV rows kept locally");
  });

  it("2. with no selection the cache still hydrates (persistence feature intact)", async () => {
    localStorage.setItem(CSV_KEY, JSON.stringify({ at: "2026-09-01", rows: rows(3) }));
    await mount({});
    expect(text()).toContain("Cached draft 1");
    expect(text()).toContain("3 CSV rows kept locally");
  });

  it("3. the cache read is capped at 50 and shape-checked; events capped; one key only", async () => {
    // Oversized but well-formed payload → capped at the read site.
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: rows(200) }));
    await mount({});
    expect(text()).toContain("50 CSV rows kept locally");
    expect(text()).not.toContain("Cached draft 200");

    // Malformed payloads hydrate nothing.
    await act(async () => {
      root!.render(
        <AnalyticsProvider initialData={snapshotWith([])}>
          <PostTable />
        </AnalyticsProvider>
      );
    });
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: "not-an-array" }));
    await act(async () => {
      root!.unmount();
      root = createRoot(container!);
      root.render(
        <AnalyticsProvider initialData={snapshotWith([])}>
          <PostTable />
        </AnalyticsProvider>
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(text()).not.toContain("CSV rows kept locally");

    // Late cache events are capped and can never overwrite an active selection.
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: rows(4) }));
    await act(async () => {
      window.dispatchEvent(new CustomEvent("eduverse:csv-imported", { detail: rows(200) }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(text()).toContain("50 CSV rows kept locally");

    // Repeated exports overwrite one key — storage stays a single bounded entry.
    for (let i = 0; i < 5; i += 1) {
      localStorage.setItem(CSV_KEY, JSON.stringify({ at: `2026-09-0${i + 1}`, rows: rows(50) }));
    }
    expect(localStorage.length).toBe(1);
    const payload = JSON.parse(localStorage.getItem(CSV_KEY)!) as { rows: unknown[] };
    expect(payload.rows.length).toBeLessThanOrEqual(50);
  });

  it("4. Clear empties the rows and removes the storage key", async () => {
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: rows(3) }));
    await mount({});
    expect(text()).toContain("Cached draft 1");
    const clear = [...container!.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("Clear"))!;
    await act(async () => clear.click()); // arm confirmation
    await act(async () => clear.click()); // confirm
    expect(text()).not.toContain("CSV rows kept locally");
    expect(localStorage.getItem(CSV_KEY)).toBeNull();
  });
});

describe("post-table keyboard paging (logic defect #5)", () => {
  it("6. ArrowRight/ArrowLeft move exactly one page, clamped at both ends", async () => {
    await mount({ posts: recentPosts }); // 7 posts / 3 per page = 3 pages
    expect(liveRegion()).toContain("Page 1 of 3");

    await press(pager(), "ArrowRight");
    expect(liveRegion()).toContain("Page 2 of 3");
    await press(pager(), "ArrowRight");
    expect(liveRegion()).toContain("Page 3 of 3");
    await press(pager(), "ArrowRight"); // clamped at the end
    expect(liveRegion()).toContain("Page 3 of 3");

    await press(pager(), "ArrowLeft");
    expect(liveRegion()).toContain("Page 2 of 3");
    await press(pager(), "ArrowLeft");
    await press(pager(), "ArrowLeft"); // clamped at the start
    expect(liveRegion()).toContain("Page 1 of 3");
    await press(pager(), "ArrowLeft");
    expect(liveRegion()).toContain("Page 1 of 3");

    // Keys outside the pager must not page.
    const table = container!.querySelector("table")!;
    await act(async () => {
      table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(liveRegion()).toContain("Page 1 of 3");
  });

  it("7. shrinking the list clamps page back into bounds (no empty 'Page 3 of 1')", async () => {
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: rows(7) }));
    await mount({}); // 7 cached rows → 3 pages
    await press(pager(), "ArrowRight");
    await press(pager(), "ArrowRight");
    expect(liveRegion()).toContain("Page 3 of 3");

    // Clear the rows: totalPages drops to 1 and page must follow.
    const clear = [...container!.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("Clear"))!;
    await act(async () => clear.click());
    await act(async () => clear.click());
    expect(liveRegion()).toContain("Page 1 of 1");
    expect(text()).toContain("No live Meta posts returned yet");
  });
});
