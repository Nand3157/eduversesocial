// @vitest-environment jsdom
/**
 * Voice mode: the header toggle auto-plays each assistant reply the moment it
 * finishes streaming, without a per-message click. Verified through the real
 * surface: enable the toggle, send a prompt, finish the stream, and assert the
 * /api/ai/tts request carried the finished reply and the <audio> element got
 * its blob and was asked to play. Also guards the two quiet-mode rules: no
 * retroactive reading of history when the mode is enabled, and no playback
 * while a reply is still streaming.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInterface } from "@/components/dashboard/chat-interface";

const encoder = new TextEncoder();
let postController: ReadableStreamDefaultController<Uint8Array> | null = null;
// Records every /api/ai/tts body so tests can assert what was spoken.
const ttsRequests: Array<{ text: string }> = [];
// Records <audio> activity from the controllable fake element.
const audioEvents: Array<{ kind: "src" | "play" | "pause" | "stop-src"; value?: string }> = [];

// jsdom's localStorage is incomplete in this environment; shim it so the
// component's persistence (and these assertions) always have a real surface.
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
const clearVoiceModeStorage = () => {
  try {
    window.localStorage.removeItem("eduverse:voice-mode");
  } catch {
    localStorageStore.delete("eduverse:voice-mode");
  }
};

class FakeAudio {
  static instances: FakeAudio[] = [];
  preload = "";
  private srcValue = "";
  private listeners = new Map<string, Array<() => void>>();
  constructor() {
    FakeAudio.instances.push(this);
  }
  get src(): string {
    return this.srcValue;
  }
  set src(value: string) {
    this.srcValue = value;
    audioEvents.push({ kind: "src", value });
  }
  addEventListener(type: string, listener: () => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((l) => l !== listener));
  }
  async play() {
    audioEvents.push({ kind: "play", value: this.srcValue });
  }
  pause() {
    audioEvents.push({ kind: "pause" });
  }
  removeAttribute(name: string) {
    if (name === "src") {
      this.srcValue = "";
      audioEvents.push({ kind: "stop-src" });
    }
  }
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url === "/api/ai/tts") {
    const body = JSON.parse(String(init?.body)) as { text: string };
    ttsRequests.push({ text: body.text });
    // Minimal valid WAV: 44-byte header + 2 bytes of samples.
    const wav = new Uint8Array(46);
    wav.set([82, 73, 70, 70], 0); // "RIFF"
    return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([wav])) } as Response);
  }
  if (init?.method === "POST") {
    const headers = new Headers({ "X-AI-Provider": "gemini", "X-Conversation-ID": "c-new", "X-Chat-Persistence": "saved" });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        postController = controller;
      }
    });
    return Promise.resolve({ ok: true, status: 200, headers, body: stream, json: () => Promise.resolve({}) } as Response);
  }
  if (url.startsWith("/api/chat?conversationId=")) return jsonResponse({ conversationId: "c1", messages: [] });
  if (url.startsWith("/api/chat")) return jsonResponse({ conversations: [] });
  if (url.startsWith("/api/ai/status")) return jsonResponse({ displayName: "Gemini 3.5 Flash" });
  return jsonResponse({});
});

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, fetch: fetchMock, Audio: FakeAudio });
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
  ttsRequests.length = 0;
  audioEvents.length = 0;
  FakeAudio.instances.length = 0;
  fetchMock.mockClear();
  clearVoiceModeStorage();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  container = null;
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

function buttonWithLabel(label: string): HTMLButtonElement {
  const match = container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!match) throw new Error(`No button with aria-label: ${label}`);
  return match;
}

async function sendPrompt() {
  // Fill the input via a prompt chip (real React path — direct value writes
  // bypass the controlled textarea's state).
  await act(async () => {
    [...container!.querySelectorAll("button")].find((button) => (button.textContent ?? "").includes("Analyze my Instagram Reels save rate"))!.click();
  });
  await act(async () => {
    container!.querySelector("textarea#chat-message")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
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

describe("voice mode (auto read-aloud)", () => {
  it("reads each new reply aloud as it finishes streaming", async () => {
    await mount();
    await act(async () => {
      buttonWithLabel("Turn voice mode on — replies are read aloud automatically").click();
    });
    expect(buttonWithLabel("Turn voice mode off")).toBeTruthy();
    expect(window.localStorage.getItem("eduverse:voice-mode")).toBe("1");

    await sendPrompt();
    await finishStream(["Hello ", "spoken ", "answer."]);

    expect(ttsRequests).toHaveLength(1);
    expect(ttsRequests[0].text).toBe("Hello spoken answer.");
    // The audio element received a blob URL and was asked to play.
    expect(audioEvents.some((event) => event.kind === "play")).toBe(true);
  });

  it("does not read history retroactively and stays silent while streaming", async () => {
    // Voice mode persisted from a previous visit.
    window.localStorage.setItem("eduverse:voice-mode", "1");
    await mount();

    await sendPrompt();
    // Mid-stream: nothing spoken yet.
    await act(async () => {
      postController?.enqueue(encoder.encode("partial"));
    });
    await flush();
    expect(ttsRequests).toHaveLength(0);
    expect(audioEvents.some((event) => event.kind === "play")).toBe(false);

    // The restored history (welcome message) is never spoken — only the
    // freshly completed reply is.
    await finishStream([" full answer"]);
    expect(ttsRequests).toHaveLength(1);
    expect(ttsRequests[0].text).toBe("partial full answer");
  });

  it("turning voice mode off stops playback and persists the choice", async () => {
    await mount();
    await act(async () => {
      buttonWithLabel("Turn voice mode on — replies are read aloud automatically").click();
    });
    await sendPrompt();
    await finishStream(["answer one"]);
    expect(ttsRequests).toHaveLength(1);

    await act(async () => {
      buttonWithLabel("Turn voice mode off").click();
    });
    expect(window.localStorage.getItem("eduverse:voice-mode")).toBe("0");
    expect(audioEvents.filter((event) => event.kind === "pause" || event.kind === "stop-src").length).toBeGreaterThan(0);

    // A subsequent reply is not spoken while the mode is off.
    await sendPrompt();
    await finishStream(["answer two"]);
    expect(ttsRequests).toHaveLength(1);
  });
});
