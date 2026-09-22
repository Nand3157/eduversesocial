// @vitest-environment jsdom
/**
 * Logic defect #8, part 2 — the landing page must render a GET /api/reviews
 * failure as a visible error, never as the "no approved notes yet" empty
 * state. Behavioral matrix:
 *   1. 200 + reviews          → count shows "N VERIFIED NOTES", no error notice
 *   2. 200 + empty list       → "NO APPROVED NOTES YET" (true empty state)
 *   3. 503 problem response   → role=alert notice + "NOTES TEMPORARILY
 *                               UNAVAILABLE", empty-state styling NOT applied
 *   4. transport rejection    → same failure treatment as 3
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LandingPage } from "@/components/landing-page";

let next: () => Response | Promise<Response>;
const fetchMock = (): Promise<Response> => Promise.resolve().then(next);

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: fetchMock,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(performance.now());
      return 0;
    },
    cancelAnimationFrame: () => undefined
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
  next = () => jsonResponse({ success: true, reviews: [] });
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
  document.body.innerHTML = "";
});

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<LandingPage />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const count = () => container!.querySelector('[class*="landing-count"]')?.textContent ?? "";
const errorNotice = () => [...container!.querySelectorAll('[role="alert"]')].find((el) => (el.textContent ?? "").includes("Reviews"));

// ---- tests ----------------------------------------------------------------

describe("landing reviews fetch — outage vs empty (logic defect #8)", () => {
  it("1. a successful fetch with reviews shows the verified count and no error", async () => {
    next = () =>
      jsonResponse({
        success: true,
        reviews: [{ id: "r1", name: "Ada Lovelace", role: null, rating: 5, content: "Great!", created_at: "2026-09-01" }]
      });
    await mount();
    expect(count()).toContain("1 VERIFIED NOTES");
    expect(errorNotice()).toBeUndefined();
  });

  it("2. a successful EMPTY fetch shows the true empty state — no error notice", async () => {
    await mount();
    expect(count()).toContain("NO APPROVED NOTES YET");
    expect(errorNotice()).toBeUndefined();
    expect(container!.querySelector('[class*="landing-feedback-empty"]')).toBeTruthy();
  });

  it("3. a 503 outage renders an error notice — never the empty state", async () => {
    next = () =>
      jsonResponse(
        { status: 503, code: "REVIEWS_UNAVAILABLE", title: "Request failed", message: "Approved reviews are temporarily unavailable.", resolution: "Retry shortly.", type: "about:blank" },
        false,
        503
      );
    await mount();
    expect(errorNotice()).toBeTruthy();
    expect(count()).toContain("NOTES TEMPORARILY UNAVAILABLE");
    expect(count()).not.toContain("NO APPROVED NOTES YET");
    expect(container!.querySelector('[class*="landing-feedback-empty"]')).toBeNull();
  });

  it("4. a transport failure gets the same error treatment", async () => {
    next = () => Promise.reject(new Error("network down"));
    await mount();
    expect(errorNotice()).toBeTruthy();
    expect(count()).toContain("NOTES TEMPORARILY UNAVAILABLE");
  });
});
