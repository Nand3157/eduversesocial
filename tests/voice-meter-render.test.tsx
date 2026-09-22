// @vitest-environment jsdom
/**
 * Fix #2 verification: while recording, ChatInterface must not commit a React
 * update per animation frame. The old hook called setLevel() ~60×/sec, so the
 * whole message tree re-reconciled on every frame; the meter now subscribes to
 * the recorder's rAF loop and writes styles directly to the DOM.
 *
 * The recorder's browser dependencies (getUserMedia, MediaRecorder,
 * AudioContext/AnalyserNode, rAF) are replaced with controllable fakes so the
 * rAF loop can be pumped deterministically frame by frame. A React Profiler
 * wrapping ChatInterface counts every commit in the chat subtree — the core
 * assertion is that this count does not move while frames are pumped.
 */
import { Profiler, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChatInterface } from "@/components/dashboard/chat-interface";

// ---- controllable browser primitives ------------------------------------

const rafCallbacks = new Map<number, FrameRequestCallback>();
let rafSeq = 0;
// Samples the fake AnalyserNode returns: 128 = silence, 200 = loud input.
const analyserSamples = new Uint8Array(512).fill(128);
const fakeStream = {
  getTracks: () => [{ stop: () => undefined }]
} as unknown as MediaStream;

function pumpFrames(count: number) {
  for (let i = 0; i < count; i += 1) {
    const frame = [...rafCallbacks.values()];
    rafCallbacks.clear();
    for (const callback of frame) callback(performance.now());
  }
}

class FakeMediaRecorder {
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    this.capturedStream = stream;
    if (options?.mimeType) this.mimeType = options.mimeType;
  }
  private readonly capturedStream: MediaStream;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

class FakeAudioContext {
  // The hook passes the MediaStream; the fake has no use for it.
  createMediaStreamSource() {
    return { connect: () => undefined };
  }
  createAnalyser() {
    return {
      fftSize: 0,
      connect: () => undefined,
      getByteTimeDomainData: (buffer: Uint8Array) => buffer.set(analyserSamples)
    };
  }
  close() {
    return Promise.resolve();
  }
}

const raf = (callback: FrameRequestCallback) => {
  rafSeq += 1;
  rafCallbacks.set(rafSeq, callback);
  return rafSeq;
};
const caf = (id: number) => {
  rafCallbacks.delete(id);
};

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    MediaRecorder: FakeMediaRecorder as unknown as typeof MediaRecorder,
    fetch: () => new Promise<Response>(() => {}),
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf
  });
  Object.assign(window, {
    AudioContext: FakeAudioContext as unknown as typeof AudioContext,
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => fakeStream }
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
  rafCallbacks.clear();
  analyserSamples.fill(128);
});

describe("voice meter render isolation", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  // Every commit inside the profiled ChatInterface subtree (message tree,
  // input area, meter) bumps this counter.
  let commits = 0;

  async function mountChat() {
    commits = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    const mounted = createRoot(container);
    root = mounted;
    await act(async () => {
      mounted.render(
        <Profiler id="chat" onRender={() => { commits += 1; }}>
          <ChatInterface />
        </Profiler>
      );
    });
    return container;
  }

  async function startRecording(el: HTMLElement) {
    const mic = el.querySelector<HTMLButtonElement>('[aria-label="Record a voice message"]');
    expect(mic, "mic button should render").toBeTruthy();
    await act(async () => {
      mic!.click();
    });
    const banner = el.querySelector<HTMLElement>('[role="status"]');
    expect(banner, "recording banner should appear").toBeTruthy();
    return banner!;
  }

  afterEach(async () => {
    if (root) {
      const mounted = root;
      root = null;
      await act(async () => {
        mounted.unmount();
      });
    }
    container?.remove();
    container = null;
  });

  it("does not commit a React update for each animation frame while recording", async () => {
    const el = await mountChat();
    // Sanity check that the harness actually observes commits.
    expect(commits).toBeGreaterThan(0);

    await startRecording(el);
    const commitsAfterStart = commits;

    // 30 loud frames, exactly what the old setLevel() path produced — the
    // message tree must NOT re-reconcile for any of them.
    analyserSamples.fill(200);
    await act(async () => {
      pumpFrames(30);
    });

    expect(commits, "chat tree committed a React update during pumped frames").toBe(commitsAfterStart);
  });

  it("still drives the meter visuals from amplitude without React state", async () => {
    const el = await mountChat();
    const banner = await startRecording(el);
    const halo = banner.querySelector<HTMLElement>('span[aria-hidden="true"]');
    const bar = banner.querySelector<HTMLDivElement>("div.bg-primary");
    expect(halo).toBeTruthy();
    expect(bar).toBeTruthy();

    const commitsAtRecording = commits;

    analyserSamples.fill(200);
    await act(async () => {
      pumpFrames(1);
    });
    expect(bar!.style.width).toBe("100%");
    expect(halo!.style.transform).toBe("scale(2)");

    analyserSamples.fill(128);
    await act(async () => {
      pumpFrames(1);
    });
    expect(bar!.style.width).toBe("0%");
    expect(halo!.style.transform).toBe("scale(1)");

    // Visuals changed across frames while React committed nothing.
    expect(commits).toBe(commitsAtRecording);
  });
});
