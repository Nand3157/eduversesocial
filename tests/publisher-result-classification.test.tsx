// @vitest-environment jsdom
/**
 * Logic defect #2: the publisher classified results by sniffing the message
 * text (`/^(failed|could not|connect|no connected)/i`), but the publish route's
 * real error strings ("Meta token expired. Reconnect account.", "Too many
 * publish requests…", …) never matched — so failures rendered as a GREEN
 * success confirmation.
 *
 * Fix under test: classification is structural — the route returns
 * `success: false` on every error (plus `errorCode`), and the modal keys on
 * `res.ok && data.success !== false`. These tests:
 *   1. pin the contract at the source level (every error object carries
 *      success:false; the string-sniffing regex is gone), and
 *   2. behaviorally loop over EVERY literal error message the publish route
 *      and social-publisher lib can return, asserting each renders as
 *      role="alert" (red) — plus genuine success renders role="status"
 *      (green), a 200-with-success:false is still red, the no-account guard
 *      is red, and upload errors surface through the red hookError channel.
 */
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnalyticsProvider } from "@/components/dashboard/analytics-context";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";

// ---- source contract ------------------------------------------------------

const routeSource = readFileSync("app/api/meta/publish/route.ts", "utf8");
const publisherLib = readFileSync("lib/social-publisher.ts", "utf8");
const uploadSource = readFileSync("app/api/meta/upload/route.ts", "utf8");
const modalSource = readFileSync("components/meta/meta-publisher-modal.tsx", "utf8");

const extractErrors = (source: string) =>
  [...source.matchAll(/success: false,[^{}]*?message: "([^"]+)"/g)].map((match) => match[1]);

const routeErrorMessages = [...new Set([...extractErrors(routeSource), ...extractErrors(publisherLib)])];

// ---- fetch mock -----------------------------------------------------------

type PublishResponder = () => Response;
let publishResponder: PublishResponder = () => {
  throw new Error("unexpected publish call");
};
let connectAccounts: unknown[] = [];

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

const fetchMock = (input: RequestInfo | URL): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith("/api/meta/publish")) return Promise.resolve(publishResponder());
  if (url.startsWith("/api/meta/connect")) return Promise.resolve(jsonResponse({ accounts: connectAccounts }));
  return Promise.resolve(jsonResponse({}));
};

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, fetch: fetchMock });
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
  connectAccounts = [{ id: "acc1", platform: "instagram", name: "EduVerse" }];
  publishResponder = () => jsonResponse({ success: false, message: "no responder configured" }, false, 500);
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
  document.body.innerHTML = "";
});

async function mountModal() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <AnalyticsProvider initialData={null}>
        <MetaPublisherModal isOpen onClose={() => {}} />
      </AnalyticsProvider>
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Submit the publish form (works even when the button is disabled). */
async function submitPublish() {
  const button = [...document.body.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("Schedule to Meta"));
  if (!button) throw new Error("publish button not found");
  const form = button.closest("form");
  if (!form) throw new Error("publish form not found");
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const alertBox = () => document.body.querySelector('[role="alert"]');
const statusBox = () => document.body.querySelector('[role="status"]');

// ---- tests ----------------------------------------------------------------

describe("publisher result classification (logic defect #2)", () => {
  it("1. source contract: every error payload carries success:false; string sniffing is gone", () => {
    // The full literal error list the route + lib can return is substantial.
    expect(routeErrorMessages.length).toBeGreaterThanOrEqual(10);
    // Includes the audit's worst offenders that used to render green.
    expect(routeErrorMessages).toContain("Meta token expired. Reconnect account.");
    expect(routeErrorMessages).toContain("Too many publish requests. Try again shortly.");
    expect(routeErrorMessages).toContain("Daily publish limit reached (100/day). Try again tomorrow.");
    expect(routeErrorMessages).toContain("Selected account is not connected.");

    // Structural rule: every HTTP error response carrying an errorCode is a
    // success:false failure (scoped to NextResponse.json — DB insert objects
    // also mention errorCode but aren't responses), and so are the lib's
    // normalized PublishFailure literals.
    for (const response of routeSource.matchAll(/NextResponse\.json\(\{[^{}]*errorCode[^{}]*\}/g)) {
      expect(response[0]).toContain("success: false");
    }
    for (const object of publisherLib.matchAll(/\{[^{}]*errorCode[^{}]*\}/g)) {
      expect(object[0]).toContain("success: false");
    }
    // Upload route: every literal `message` payload is also a success:false error.
    for (const object of uploadSource.matchAll(/\{[^{}]*message: "[^"]+"[^{}]*\}/g)) {
      expect(object[0]).toContain("success: false");
    }

    // The modal must key on the payload, not on message text.
    expect(modalSource).not.toContain("isErrorResult");
    expect(modalSource).toContain("data.success !== false");
  });

  it("2. every error message the publish route can return renders as role=alert (red), never green", async () => {
    await mountModal();
    for (const message of routeErrorMessages) {
      publishResponder = () =>
        jsonResponse({ success: false, errorCode: "META_TEST", message }, false, 400);
      await submitPublish();
      expect(alertBox()?.textContent).toContain(message);
      expect(statusBox()).toBeNull(); // never a green confirmation
    }
  });

  it("3. an HTTP-200 body that says success:false still renders as an error", async () => {
    await mountModal();
    publishResponder = () => jsonResponse({ success: false, message: "Meta did not confirm publication." }, true, 200);
    await submitPublish();
    expect(alertBox()?.textContent).toContain("Meta did not confirm publication.");
    expect(statusBox()).toBeNull();
  });

  it("4. a genuine success still renders green (role=status), no alert", async () => {
    await mountModal();
    publishResponder = () => jsonResponse({ success: true, status: "SCHEDULED", postId: "post_9" });
    await submitPublish();
    expect(statusBox()?.textContent).toContain("Post scheduled (post_9)");
    expect(alertBox()).toBeNull();
  });

  it("5. publishing with no connected account renders an error alert", async () => {
    connectAccounts = [];
    await mountModal();
    await submitPublish();
    expect(alertBox()?.textContent).toContain("Connect a Meta account before publishing.");
    expect(statusBox()).toBeNull();
  });

  it("6. upload failures surface through the red hookError channel", async () => {
    await mountModal();
    const bigFile = new File([new ArrayBuffer(5 * 1024 * 1024)], "big.png", { type: "image/png" });
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    Object.defineProperty(input, "files", { configurable: true, value: [bigFile] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(alertBox()?.textContent).toContain("Image must be under 4 MB.");
  });
});
