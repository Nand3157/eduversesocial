// @vitest-environment jsdom
/**
 * Logic defect #3: the analytics context provided `error` but nothing consumed
 * it, and non-OK responses were silently turned into `data: null` — so an
 * outage rendered exactly like an empty workspace (placeholder cards, no
 * retry). Fixed by (a) classifying every failure mode (transport, non-OK,
 * `success: false` body) as `error`, and (b) a shell-level banner that renders
 * only on error with a Retry that calls the context's `refresh()`.
 *
 * Pinned behaviors:
 *   1. transport failure  → banner (role=alert), data null, loading settles
 *   2. HTTP 429 body      → banner (the old code swallowed this into null data)
 *   3. Retry              → loading goes true, banner hides, then success
 *                           clears the error and restores data
 *   4. successful EMPTY   → NO banner, data set (empty state stays distinct)
 *   5. seeded snapshot    → no fetch, no banner
 * plus a source contract that the shell actually renders the banner.
 */
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnalyticsProvider, useAnalytics } from "@/components/dashboard/analytics-context";
import { AnalyticsErrorBanner } from "@/components/dashboard/analytics-error-banner";
import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

// Banner tests only care about null vs non-null payloads; the full snapshot
// shape is exercised by the analytics tests themselves.
const EMPTY_SNAPSHOT = {
  live: false,
  accounts: [],
  recentPosts: [],
  metrics: [],
  memoryItems: [],
  recommendations: [],
  timingSignals: []
} as unknown as AnalyticsSnapshot;
const SEEDED_SNAPSHOT = { ...EMPTY_SNAPSHOT, live: true, metrics: [{ label: "Reach", value: "1.2k", suffix: "", detail: "7d" }] } as unknown as AnalyticsSnapshot;

type Step = () => Response | Promise<Response>;
const fetchSteps: Step[] = [];
let defaultStep: Step = () => jsonResponse(EMPTY_SNAPSHOT);
let fetchCount = 0;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

const fetchMock = (): Promise<Response> => {
  fetchCount += 1;
  const step = fetchSteps.shift() ?? defaultStep;
  return Promise.resolve().then(() => step());
};

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, fetch: fetchMock });
});

beforeEach(() => {
  fetchSteps.length = 0;
  fetchCount = 0;
  defaultStep = () => jsonResponse(EMPTY_SNAPSHOT);
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
  document.body.innerHTML = "";
});

/** Reads context state so tests can assert loading/error/data transitions. */
function Probe() {
  const { loading, error, data } = useAnalytics();
  return <div data-testid="probe" data-loading={String(loading)} data-error={String(error)} data-hasdata={String(data != null)} />;
}

async function mount(initialData: AnalyticsSnapshot | null = null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <AnalyticsProvider initialData={initialData}>
        <Probe />
        <AnalyticsErrorBanner />
      </AnalyticsProvider>
    );
  });
  await flush();
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function probe() {
  const element = container!.querySelector('[data-testid="probe"]')!;
  return {
    loading: element.getAttribute("data-loading") === "true",
    error: element.getAttribute("data-error") === "true",
    hasData: element.getAttribute("data-hasdata") === "true"
  };
}

const banner = () => container!.querySelector('[role="alert"]');

async function clickRetry() {
  const button = [...container!.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("Retry"));
  if (!button) throw new Error("Retry button not found");
  await act(async () => {
    button.click();
  });
}

// ---- tests ----------------------------------------------------------------

describe("analytics error surfacing (logic defect #3)", () => {
  it("1. a transport failure shows the error banner (distinct from empty), loading settles", async () => {
    fetchSteps.push(() => Promise.reject(new Error("network down")));
    await mount();
    expect(probe()).toEqual({ loading: false, error: true, hasData: false });
    expect(banner()?.textContent).toContain("Analytics failed to load");
    expect(banner()?.textContent).toContain("Retry");
  });

  it("2. an HTTP-429 failure body also shows the banner (was silently null data)", async () => {
    fetchSteps.push(() => jsonResponse({ success: false, live: false, error: "Too many requests. Try again shortly." }, false, 429));
    await mount();
    expect(probe().error).toBe(true);
    expect(probe().hasData).toBe(false);
    expect(banner()).toBeTruthy();
  });

  it("3. a success:false body with HTTP 200 also shows the banner", async () => {
    fetchSteps.push(() => jsonResponse({ success: false, live: false, error: "not configured" }, true, 200));
    await mount();
    expect(probe().error).toBe(true);
    expect(banner()).toBeTruthy();
  });

  it("4. Retry: loading goes true, banner hides, then success restores data and clears error", async () => {
    fetchSteps.push(() => Promise.reject(new Error("down")));
    await mount();
    expect(banner()).toBeTruthy();

    // Hold the retry response so the loading state is observable.
    let release!: (response: Response) => void;
    fetchSteps.push(() => new Promise<Response>((resolve) => { release = resolve; }));
    await clickRetry();
    expect(probe().loading).toBe(true); // loading still behaves
    expect(banner()).toBeNull(); // banner hides while retrying

    await act(async () => { release(jsonResponse(SEEDED_SNAPSHOT)); });
    await flush();
    expect(probe()).toEqual({ loading: false, error: false, hasData: true });
    expect(banner()).toBeNull();
  });

  it("5. a successful-but-EMPTY fetch never shows the banner (empty state stays distinct)", async () => {
    await mount();
    expect(fetchCount).toBe(1);
    expect(probe()).toEqual({ loading: false, error: false, hasData: true });
    expect(banner()).toBeNull();
  });

  it("6. a seeded snapshot skips the mount fetch and shows no banner", async () => {
    await mount(SEEDED_SNAPSHOT);
    expect(fetchCount).toBe(0);
    expect(probe()).toEqual({ loading: false, error: false, hasData: true });
    expect(banner()).toBeNull();
  });

  it("7. source contract: the shell renders the banner above page content", () => {
    const shell = readFileSync("components/dashboard/app-shell.tsx", "utf8");
    const main = shell.split('id="main-content"')[1] ?? "";
    expect(main.indexOf("<AnalyticsErrorBanner />")).toBeGreaterThan(-1);
    expect(main.indexOf("<AnalyticsErrorBanner />")).toBeLessThan(main.indexOf("<motion.div"));
    // Context classifies every failure mode structurally.
    const context = readFileSync("components/dashboard/analytics-context.tsx", "utf8");
    expect(context).toContain("!response.ok || payload?.success === false");
  });
});
