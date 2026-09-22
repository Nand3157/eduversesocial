// @vitest-environment jsdom
/**
 * Logic defect #9: the server emits `X-Chat-Persistence: unavailable` when a
 * turn could not be saved (workspace missing, DB failure) — but no client code
 * read the header, so users believed history was saved when it wasn't.
 * The chat now surfaces a non-blocking `role="status"` notice whenever the
 * header says "unavailable", and clears it on conversation switches/new chats.
 * Normal flow is untouched: no notice on `saved`, streaming unaffected.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChatInterface } from "@/components/dashboard/chat-interface";

const CONVERSATIONS = [{ id: "c1", title: "Alpha rollout", updated_at: new Date().toISOString() }];

const encoder = new TextEncoder();
let postPersistence: "saved" | "unavailable" = "saved";
let postController: ReadableStreamDefaultController<Uint8Array> | null = null;

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (init?.method === "POST") {
    const headers = new Headers({ "X-AI-Provider": "gemini", "X-Conversation-ID": "c-new", "X-Chat-Persistence": postPersistence });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        postController = controller;
      }
    });
    return Promise.resolve({ ok: true, status: 200, headers, body: stream, json: () => Promise.resolve({}) } as Response);
  }
  if (url.startsWith("/api/chat?conversationId=")) {
    return jsonResponse({ conversationId: "c1", messages: [{ role: "assistant", content: "Opened c1" }] });
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
  postPersistence = "saved";
  postController = null;
});

afterEach(() => {
  document.body.innerHTML = "";
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<ChatInterface />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
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

const notice = () =>
  [...container!.querySelectorAll('[role="status"]')].find((el) => (el.textContent ?? "").includes("Saving is temporarily unavailable"));

function buttonWithText(text: string): HTMLButtonElement {
  const match = [...container!.querySelectorAll("button")].find((button) => (button.textContent ?? "").includes(text));
  if (!match) throw new Error(`No button found containing: ${text}`);
  return match;
}

async function sendPrompt() {
  await act(async () => {
    buttonWithText("Analyze my Instagram Reels save rate").click();
  });
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

// ---- tests ----------------------------------------------------------------

describe("chat persistence warning (logic defect #9)", () => {
  it("1. a saved turn shows NO notice (normal flow untouched)", async () => {
    await mount();
    try {
      await sendPrompt();
      await finishStream(["ANSWER"]);
      expect(notice()).toBeUndefined();
      expect(container!.textContent).toContain("ANSWER");
    } finally {
      await unmount();
    }
  });

  it("2. an unavailable header shows the non-blocking notice alongside the answer", async () => {
    await mount();
    try {
      postPersistence = "unavailable";
      await sendPrompt();
      await finishStream(["ANSWER WITHOUT SAVE"]);
      expect(notice()?.textContent).toContain("Saving is temporarily unavailable");
      expect(notice()?.textContent).toContain("won't appear in your history");
      // The reply itself still renders — the warning is non-blocking.
      expect(container!.textContent).toContain("ANSWER WITHOUT SAVE");
    } finally {
      await unmount();
    }
  });

  it("3. the notice clears when switching conversations or starting a new one", async () => {
    await mount();
    try {
      postPersistence = "unavailable";
      await sendPrompt();
      await finishStream(["X"]);
      expect(notice()).toBeTruthy();

      await act(async () => {
        buttonWithText("Alpha rollout").click();
      });
      await flush();
      expect(notice()).toBeUndefined(); // cleared on conversation open

      postPersistence = "unavailable";
      await sendPrompt();
      await finishStream(["Y"]);
      expect(notice()).toBeTruthy();
      await act(async () => {
        [...container!.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes("New conversation"))!.click();
      });
      await flush();
      expect(notice()).toBeUndefined(); // cleared on new conversation
    } finally {
      await unmount();
    }
  });
});
