// @vitest-environment jsdom
/**
 * Mobile defect #1: below 1024px the desktop aside (`hidden … lg:block`) hid
 * the only UI for switching conversations and starting a new one. ChatInterface
 * now also renders a compact switcher inside an `lg:hidden` bar. This test
 * pins, in jsdom (no CSS media queries, so visibility is pinned structurally):
 *   1. the mobile switcher exists and lives under an `lg:hidden` container,
 *      while the desktop aside keeps its `hidden lg:block` contract;
 *   2. a phone-sized user can open the list, switch conversations (correct
 *      fetch issued, messages swapped in), and start a new conversation.
 *
 * Mobile defect #2: the chat column must be viewport-bound (dvh, no min-height
 * floors), the message list must scroll internally (min-h-0 + overflow-y-auto),
 * and the composer must be a non-shrinking block after it — so on short
 * viewports the composer stays reachable and nothing escapes to the page.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChatInterface } from "@/components/dashboard/chat-interface";

const CONVERSATIONS = [
  { id: "c1", title: "Alpha rollout", updated_at: new Date().toISOString() },
  { id: "c2", title: "Beta feedback", updated_at: new Date().toISOString() }
];

const fetchCalls: string[] = [];

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = (input: RequestInfo | URL): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  fetchCalls.push(url);
  if (url.startsWith("/api/chat?conversationId=")) {
    const id = new URLSearchParams(url.split("?")[1]).get("conversationId");
    return jsonResponse({ conversationId: id, messages: [{ role: "assistant", content: `Hello from conversation ${id}` }] });
  }
  if (url.startsWith("/api/chat")) return jsonResponse({ conversations: CONVERSATIONS });
  if (url.startsWith("/api/ai/status")) return jsonResponse({ displayName: "Gemini 3.5 Flash" });
  return jsonResponse({});
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
  fetchCalls.length = 0;
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ---- helpers --------------------------------------------------------------

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<ChatInterface />);
  });
  // Flush the mount-time fetches (conversation list, AI status).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function unmount() {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
}

function buttons(): HTMLButtonElement[] {
  return [...container!.querySelectorAll("button")];
}

function buttonWithText(text: string): HTMLButtonElement {
  const match = buttons().find((button) => (button.textContent ?? "").includes(text));
  if (!match) throw new Error(`No button found containing: ${text}`);
  return match;
}

/** The mobile bar wraps its controls in an `lg:hidden` container. */
function mobileBar(): HTMLElement {
  const toggle = buttonWithText("Saved conversations");
  const bar = toggle.closest('[class*="lg:hidden"]');
  if (!bar) throw new Error("Conversation toggle is not inside an lg:hidden container");
  return bar as HTMLElement;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

// ---- tests ----------------------------------------------------------------

describe("mobile conversation access (≤1023px)", () => {
  it("renders a mobile-only switcher with New conversation, keeps desktop aside intact", async () => {
    await mount();
    try {
      const bar = mobileBar();
      // New conversation is reachable from the mobile bar…
      const newButton = [...bar.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("New conversation"));
      expect(newButton).toBeTruthy();
      // …and the toggle exposes its state for assistive tech.
      const toggle = buttonWithText("Saved conversations");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(toggle.getAttribute("aria-controls")).toBe("mobile-conversation-list");
      // Desktop contract unchanged: aside stays hidden below lg, visible at lg.
      const aside = container!.querySelector("aside")!;
      expect(aside.className).toContain("hidden");
      expect(aside.className).toContain("lg:block");
    } finally {
      await unmount();
    }
  });

  it("lets a phone user list conversations, switch, and start a new one", async () => {
    await mount();
    try {
      // Open the list.
      const toggle = buttonWithText("Saved conversations");
      await click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      const list = container!.querySelector("#mobile-conversation-list")!;
      expect(list).toBeTruthy();
      expect(list.textContent).toContain("Alpha rollout");
      expect(list.textContent).toContain("Beta feedback");

      // Switch conversation → correct fetch + messages swapped in + panel closed.
      await click([...list.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("Alpha rollout"))!);
      expect(fetchCalls).toContain("/api/chat?conversationId=c1");
      expect(container!.textContent).toContain("Hello from conversation c1");
      expect(container!.querySelector("#mobile-conversation-list")).toBeNull();

      // Start a new conversation from the mobile bar → back to the welcome state.
      const bar = mobileBar();
      const newButton = [...bar.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("New conversation"))!;
      await click(newButton);
      expect(container!.textContent).toContain("I've reviewed your latest audience signals");
      expect(container!.textContent).not.toContain("Hello from conversation c1");
    } finally {
      await unmount();
    }
  });

  it("shows both saved conversations on first load", async () => {
    await mount();
    try {
      await click(buttonWithText("Saved conversations"));
      const list = container!.querySelector("#mobile-conversation-list")!;
      expect(list.querySelectorAll("button")).toHaveLength(2);
    } finally {
      await unmount();
    }
  });
});

describe("chat column layout contract (mobile defect #2)", () => {
  it("bounds the column to the visible viewport and scrolls messages internally", async () => {
    await mount();
    try {
      const root = container!.querySelector("div.grid")!;
      // Viewport-bound height in dvh (100vh misbehaves on iOS), not a growable
      // min-height — the old min-h-[calc(100vh-150px)] let the page scroll.
      // Per-band heights subtract exactly the shell's header + main padding +
      // dock clearance (mobile defect #3), so the page itself never scrolls;
      // desktop keeps the original -150px contract.
      expect(root.className).toContain("h-[calc(100dvh_-_160px_-_env(safe-area-inset-bottom))]");
      expect(root.className).toContain("sm:h-[calc(100dvh_-_168px_-_env(safe-area-inset-bottom))]");
      expect(root.className).toContain("lg:h-[calc(100dvh-150px)]");
      expect(root.className).not.toContain("min-h-[calc(100vh-150px)]");
      // Bounded rows: capped auto bar row + minmax(0,1fr) chat row (lg: single row).
      expect(root.className).toContain("grid-rows-[auto_minmax(0,1fr)]");
      expect(root.className).toContain("lg:grid-rows-[minmax(0,1fr)]");
      // Nothing escapes the column horizontally or vertically.
      expect(root.className).toContain("overflow-hidden");

      // The open conversation panel can never crowd the composer out of view.
      const toggle = buttonWithText("Saved conversations");
      const bar = toggle.parentElement!.parentElement!;
      expect(bar.className).toContain("max-h-[55dvh]");
      expect(bar.className).toContain("overflow-y-auto");

      const section = container!.querySelector("section")!;
      expect(section.className).toMatch(/\bflex\b/);
      expect(section.className).toContain("flex-col");
      expect(section.className).toContain("min-h-0"); // may shrink below content
      expect(section.className).not.toContain("min-h-[600px]"); // floor removed
      expect(section.className).toContain("overflow-hidden");
      expect(section.children[0].className).toContain("shrink-0"); // header pinned

      const messages = container!.querySelector('[role="log"]')!;
      expect(messages.className).toContain("flex-1");
      // Without min-h-0 a flex item refuses to shrink below content, so
      // overflow-y-auto never engages and the list grows the page instead.
      expect(messages.className).toContain("min-h-0");
      expect(messages.className).toContain("overflow-y-auto");

      const composer = container!.querySelector("form.flex.items-end")!.parentElement as HTMLElement;
      expect(composer.className).toContain("shrink-0");
      const order = [...section.children];
      expect(order.indexOf(messages)).toBeGreaterThanOrEqual(0);
      expect(order.indexOf(composer)).toBeGreaterThan(order.indexOf(messages));
      expect(composer.querySelector("textarea#chat-message")).toBeTruthy();
    } finally {
      await unmount();
    }
  });
});
