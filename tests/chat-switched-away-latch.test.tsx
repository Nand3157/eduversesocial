// @vitest-environment jsdom
/**
 * Logic defect #1: `switchedAwayRef` was a one-way latch — set true when the
 * user opened a conversation and never cleared — so after ONE switch every
 * later AI reply hit the `renderStream` early-return (empty assistant bubble)
 * and every failure hit the guarded catch (swallowed error). The fix is a
 * view-generation token: each send captures the generation when it starts and
 * may only write while it still matches.
 *
 * Three pinned behaviors:
 *   (a) a reply to the CURRENT conversation always renders after a switch;
 *   (b) a genuinely superseded in-flight stream never writes into the view it
 *       was switched away from;
 *   (c) an error after a switch still renders its error bubble.
 *
 * The POST /api/chat response streams through a controllable ReadableStream so
 * a chunk can be delivered before/after a mid-flight conversation switch.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChatInterface } from "@/components/dashboard/chat-interface";

const CONVERSATIONS = [
  { id: "c1", title: "Alpha rollout", updated_at: new Date().toISOString() },
  { id: "c2", title: "Beta feedback", updated_at: new Date().toISOString() }
];

const encoder = new TextEncoder();
let postController: ReadableStreamDefaultController<Uint8Array> | null = null;
let failNextPost: string | null = null;
const fetchCalls: string[] = [];

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  fetchCalls.push(url);
  if (init?.method === "POST") {
    if (failNextPost) {
      const message = failNextPost;
      failNextPost = null;
      return Promise.reject(new Error(message));
    }
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        postController = controller;
      }
    });
    return Promise.resolve({
      ok: true,
      status: 200,
      // The server mints a fresh conversation for this send — distinct from c1,
      // so clicking c1 afterwards is a real switch (not `id === conversationId`).
      headers: new Headers({ "X-AI-Provider": "gemini", "X-Conversation-ID": "c-new" }),
      body: stream,
      json: () => Promise.resolve({})
    } as Response);
  }
  if (url.startsWith("/api/chat?conversationId=")) {
    const id = new URLSearchParams(url.split("?")[1]).get("conversationId");
    return jsonResponse({ conversationId: id, messages: [{ role: "assistant", content: `Opened ${id}` }] });
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
  postController = null;
  failNextPost = null;
  fetchCalls.length = 0;
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ---- harness --------------------------------------------------------------

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<ChatInterface />);
  });
  await flush();
}

async function unmount() {
  if (root) await act(async () => root!.unmount());
  root = null;
  container = null;
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function buttonWithText(text: string): HTMLButtonElement {
  const match = [...container!.querySelectorAll("button")].find((button) => (button.textContent ?? "").includes(text));
  if (!match) throw new Error(`No button found containing: ${text}`);
  return match;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
  await flush();
}

/** Open a saved conversation from the desktop aside (always in the DOM). */
async function switchToConversation(title: string) {
  await click(buttonWithText(title));
}

/** Fill the composer from a prompt chip, then submit with Enter. */
async function sendPrompt() {
  await click(buttonWithText("Analyze my Instagram Reels save rate"));
  const textarea = container!.querySelector("textarea#chat-message")!;
  await act(async () => {
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await flush();
}

async function finishStream(chunks: string[]) {
  await act(async () => {
    for (const chunk of chunks) postController?.enqueue(encoder.encode(chunk));
    postController?.close();
    postController = null;
  });
  await flush();
}

const text = () => container!.textContent ?? "";

// ---- tests ----------------------------------------------------------------

describe("switched-away latch → view generation (logic defect #1)", () => {
  it("(b) a superseded in-flight stream never writes into the conversation you switched to", async () => {
    await mount();
    try {
      await sendPrompt();
      expect(postController).not.toBeNull(); // stream is in flight

      await switchToConversation("Alpha rollout");
      expect(text()).toContain("Opened c1");

      await finishStream(["STALE STREAM CONTENT"]);

      expect(text()).not.toContain("STALE STREAM CONTENT");
      expect(text()).toContain("Opened c1");
    } finally {
      await unmount();
    }
  });

  it("(a) after switching conversations, a new send renders the assistant reply", async () => {
    await mount();
    try {
      await switchToConversation("Alpha rollout");
      expect(text()).toContain("Opened c1");

      await sendPrompt();
      expect(postController).not.toBeNull();
      await finishStream(["FRESH ANSWER"]);

      // The core regression: the old latch dropped this render entirely,
      // leaving a permanently empty assistant bubble.
      expect(text()).toContain("FRESH ANSWER");
      expect(text()).toContain("Opened c1"); // new conversation still on screen
    } finally {
      await unmount();
    }
  });

  it("(c) after switching conversations, a failed send renders its error bubble", async () => {
    await mount();
    try {
      await switchToConversation("Alpha rollout");

      failNextPost = "network down";
      await sendPrompt();

      // The old latch swallowed this: the guarded catch rendered nothing.
      expect(text()).toContain("I couldn't complete that request. network down");
    } finally {
      await unmount();
    }
  });
});
