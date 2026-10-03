// @vitest-environment jsdom
/**
 * Read-aloud fallback must never show a failure while something is still
 * playing.
 *
 * The reported bug was a message displaying "Stop" + a "device voice" badge +
 * "Could not play this reply." at the same time. That combination came from two
 * paths racing on one click: the <audio> element refused the blob (CSP blocked
 * it), which fired `error` and set the error state, and the rejected play()
 * promise then handed playback to SpeechSynthesis, which set the "device
 * voice" badge. Suppressing the element error while the fallback is pending
 * keeps the three states mutually exclusive.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInterface } from "@/components/dashboard/chat-interface";

const encoder = new TextEncoder();
let postController: ReadableStreamDefaultController<Uint8Array> | null = null;

/** Set by the fake element to make play() reject the way a blocked blob does. */
let playShouldReject = false;

class FakeAudio {
  preload = "";
  private srcValue = "";
  private listeners = new Map<string, Array<() => void>>();
  get src(): string {
    return this.srcValue;
  }
  set src(value: string) {
    this.srcValue = value;
  }
  addEventListener(type: string, listener: () => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }
  /** Fire a DOM event, as the browser would when a media load is blocked. */
  dispatch(type: string) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }
  async play() {
    if (!playShouldReject) return;
    // Browsers reject play() *and* fire `error` for a blocked/undecodable src.
    queueMicrotask(() => this.dispatch("error"));
    throw new DOMException("play() blocked", "NotSupportedError");
  }
  pause() {}
  removeAttribute() {}
}

/** Records utterances so the test can assert the device voice actually spoke. */
const spoken: string[] = [];

class FakeUtterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url === "/api/ai/tts") {
    // A minimal but valid WAV header so the client treats it as real audio.
    const wav = new Uint8Array(46);
    wav.set([82, 73, 70, 70], 0);
    return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([wav])) } as Response);
  }
  if (init?.method === "POST") {
    const headers = new Headers({ "X-Conversation-ID": "c-new", "X-Chat-Persistence": "saved" });
    return Promise.resolve({
      ok: true,
      status: 200,
      headers,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          postController = controller;
        }
      }),
      json: () => Promise.resolve({})
    } as Response);
  }
  if (url.startsWith("/api/chat?conversationId=")) return jsonResponse({ conversationId: "c1", messages: [] });
  if (url.startsWith("/api/chat")) return jsonResponse({ conversations: [] });
  if (url.startsWith("/api/ai/status")) return jsonResponse({ displayName: "Gemini 3.5 Flash" });
  return jsonResponse({});
});

// jsdom's localStorage is incomplete in this environment; shim it so the
// component's voice-mode persistence (and this file's reset) has a real surface.
const localStorageStore = new Map<string, string>();
if (typeof window.localStorage?.getItem !== "function") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => localStorageStore.get(key) ?? null,
      setItem: (key: string, value: string) => void localStorageStore.set(key, value),
      removeItem: (key: string) => void localStorageStore.delete(key)
    }
  });
}

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: fetchMock,
    Audio: FakeAudio,
    SpeechSynthesisUtterance: FakeUtterance
  });
  // jsdom has no object-URL support; the hook only needs stable strings.
  URL.createObjectURL = () => "blob:fake";
  URL.revokeObjectURL = () => undefined;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak: (utterance: FakeUtterance) => {
        spoken.push(utterance.text);
      },
      cancel: () => undefined
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
  postController = null;
  spoken.length = 0;
  playShouldReject = false;
  fetchMock.mockClear();
  localStorageStore.delete("eduverse:voice-mode");
  try {
    window.localStorage.removeItem("eduverse:voice-mode");
  } catch {
    // already absent from the shimmed store
  }
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<ChatInterface />);
  });
  await flush();
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  container = null;
});

/** Stream one assistant reply so a Listen button exists on a real message. */
async function streamReply(text: string) {
  await act(async () => {
    [...container!.querySelectorAll("button")].find((button) => (button.textContent ?? "").includes("Analyze my Instagram Reels save rate"))!.click();
  });
  await act(async () => {
    container!.querySelector("textarea#chat-message")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await flush();
  await act(async () => {
    postController?.enqueue(encoder.encode(text));
    postController?.close();
    postController = null;
  });
  await flush();
}

const READ_ALOUD = 'button[aria-label="Read this reply aloud"], button[aria-label="Stop reading aloud"]';

/** The read-aloud button on the streamed reply — the last one rendered. */
function listenButton(): HTMLButtonElement {
  const matches = [...container!.querySelectorAll<HTMLButtonElement>(READ_ALOUD)];
  const match = matches[matches.length - 1];
  if (!match) throw new Error("No read-aloud button rendered");
  return match;
}

function rowText(): string {
  return listenButton().parentElement?.textContent ?? "";
}

describe("read-aloud fallback (useTts)", () => {
  it("hands a blocked clip to the device voice without claiming a failure", async () => {
    await mount();
    await streamReply("A reply worth reading aloud.");
    playShouldReject = true;

    await act(async () => {
      listenButton().click();
    });
    await flush();

    // The device voice took over...
    expect(spoken.join(" ")).toContain("A reply worth reading aloud.");
    expect(rowText()).toContain("device voice");
    expect(listenButton().textContent).toContain("Stop");

    // ...and, critically, it does not also report that playback failed.
    expect(rowText()).not.toContain("Could not play this reply.");
  });

  it("reports a genuine playback failure once no fallback is left", async () => {
    await mount();
    await streamReply("Another reply.");
    playShouldReject = true;
    // No SpeechSynthesis in this window: the fallback cannot start.
    const saved = window.speechSynthesis;
    // @ts-expect-error deliberately removing the API for this assertion
    delete window.speechSynthesis;

    await act(async () => {
      listenButton().click();
    });
    await flush();

    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: saved });
    expect(container!.textContent).toContain("Could not play this reply.");
  });

  it("plays a healthy clip without touching the device voice", async () => {
    await mount();
    await streamReply("Straight to the audio element.");

    await act(async () => {
      listenButton().click();
    });
    await flush();

    expect(spoken).toHaveLength(0);
    expect(rowText()).not.toContain("device voice");
    expect(rowText()).not.toContain("Could not play this reply.");
    expect(listenButton().textContent).toContain("Stop");
  });
});
