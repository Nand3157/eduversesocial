"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clampSpeechText, stripMarkdownForSpeech } from "@/lib/speech/speech-text";
import { TTS_VOICE_BY_PRESENTATION, type TtsPresentation } from "@/lib/ai/tts-preference";

const TTS_CACHE_TTL_MS = 10 * 60_000;
const TTS_FALLBACK_CACHE_TTL_MS = 60_000;
const TTS_CACHE_MAX_ENTRIES = 8;

type CachedPlayback =
  | { kind: "audio"; blob: Blob; expiresAt: number }
  | { kind: "device"; expiresAt: number };

function readCachedPlayback(cache: Map<string, CachedPlayback>, key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh insertion order so the least recently used clip is evicted first.
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function storeCachedPlayback(cache: Map<string, CachedPlayback>, key: string, entry: CachedPlayback) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > TTS_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export type UseTts = {
  /** Message index currently loading audio (fetch in flight). */
  loadingIndex: number | null;
  /** Message index currently playing. */
  playingIndex: number | null;
  /** True when the browser cannot play audio at all (no <audio>, no speechSynthesis). */
  unsupported: boolean;
  /** Message index that failed last (error surfaced per message). */
  errorIndex: number | null;
  /** True while the current playback uses the on-device voice fallback. */
  usingDeviceVoice: boolean;
  /** Toggle play/stop for a message. Only one clip plays at a time. */
  toggle: (index: number, text: string, presentation: TtsPresentation) => void;
  /** Stop playback and clear pending audio. */
  stop: () => void;
};

/**
 * Read-aloud playback for assistant messages. Audio is fetched from
 * /api/ai/tts (Gemini 3.8 Flash-Lite TTS) as a WAV blob and played through a
 * single reusable <audio> element, so only one reply is ever audible and
 * switching messages tears down the previous clip.
 *
 * On-device fallback: if the server synthesis fails (rate limit, provider
 * outage, unverified account) the message is spoken with the browser's
 * built-in SpeechSynthesis voice instead, so Listen keeps working offline of
 * the Gemini quota.
 */
export function useTts(): UseTts {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [usingDeviceVoice, setUsingDeviceVoice] = useState(false);
  // Audio support is only knowable in the browser. The server snapshot is
  // `false` so the first client render matches the server HTML — reading
  // window during render made the server ship `disabled` and the client flip
  // it off, which React reports as a hydration mismatch.
  const playbackReady = useSyncExternalStore(subscribeToNothing, playbackSupported, () => false);
  const unsupported = !playbackReady;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingForRef = useRef<number | null>(null);
  const deviceVoiceRef = useRef(false);
  // Keep a small, short-lived per-session cache. Replaying the same reply does
  // not spend another TTS call; provider failures also reuse the device voice
  // briefly instead of immediately routing the same text to the provider again.
  const playbackCacheRef = useRef(new Map<string, CachedPlayback>());
  // Monotonic token identifying the current playback attempt. Bumped by every
  // toggle and by stop(), so a fetch or play() that resolves late can tell it
  // has been superseded instead of hijacking whatever is playing now.
  const requestRef = useRef(0);
  // True between "handed the element a blob URL" and "play() settled". An
  // element error in that window is recoverable — the device-voice fallback is
  // about to take over — so it must not also raise "Could not play this reply".
  const recoverableRef = useRef(false);

  useEffect(() => {
    const clearPlaybackState = () => {
      setPlayingIndex(null);
      playingForRef.current = null;
      deviceVoiceRef.current = false;
      setUsingDeviceVoice(false);
    };
    const onEnded = () => clearPlaybackState();
    const onError = () => {
      if (playingForRef.current === null) return;
      if (!recoverableRef.current) setErrorIndex(playingForRef.current);
      clearPlaybackState();
    };
    if (unsupported) return;
    const element = window.Audio ? new Audio() : null;
    if (element) {
      element.preload = "auto";
      element.addEventListener("ended", onEnded);
      element.addEventListener("error", onError);
      audioRef.current = element;
    }
    return () => {
      if (element) {
        element.removeEventListener("ended", onEnded);
        element.removeEventListener("error", onError);
        element.pause();
        element.src = "";
      }
      audioRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [unsupported]);

  const stop = useCallback(() => {
    requestRef.current += 1;
    recoverableRef.current = false;
    const element = audioRef.current;
    if (element) {
      element.pause();
      element.removeAttribute("src");
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    playingForRef.current = null;
    deviceVoiceRef.current = false;
    setUsingDeviceVoice(false);
    setPlayingIndex(null);
  }, []);

  /** Fallback path: speak the stripped text with the browser's own voice. */
  const playDeviceVoice = useCallback((index: number, text: string, presentation: TtsPresentation) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setErrorIndex(index);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(clampSpeechText(stripMarkdownForSpeech(text)));
    const names = synth.getVoices();
    const genderPattern = presentation === "female"
      ? /\b(female|woman|samantha|victoria|karen|zira|susan|ava|allison|aria|jenny)\b/i
      : /\b(male|man|david|alex|daniel|james|fred|george|mark|guy|ryan)\b/i;
    const matchingVoice = names.find((voice) => genderPattern.test(voice.name));
    if (matchingVoice) utterance.voice = matchingVoice;
    playingForRef.current = index;
    deviceVoiceRef.current = true;
    utterance.onend = () => {
      if (playingForRef.current === index) {
        playingForRef.current = null;
        deviceVoiceRef.current = false;
        setUsingDeviceVoice(false);
        setPlayingIndex(null);
      }
    };
    utterance.onerror = () => {
      if (playingForRef.current === index) {
        playingForRef.current = null;
        deviceVoiceRef.current = false;
        setUsingDeviceVoice(false);
        setPlayingIndex(null);
        setErrorIndex(index);
      }
    };
    setUsingDeviceVoice(true);
    setPlayingIndex(index);
    synth.speak(utterance);
  }, []);

  const toggle = useCallback(
    (index: number, text: string, presentation: TtsPresentation) => {
      setErrorIndex(null);
      // Second click on the playing message stops it (either engine).
      if (playingForRef.current === index) {
        stop();
        return;
      }
      // Switching messages stops whatever is currently playing first.
      stop();
      // Server-quality voice first; the device voice is the fallback.
      const element = audioRef.current;
      if (!element) {
        playDeviceVoice(index, text, presentation);
        return;
      }
      const voice = TTS_VOICE_BY_PRESENTATION[presentation];
      const cacheKey = `${voice}:${clampSpeechText(stripMarkdownForSpeech(text)) || text.trim()}`;
      const cached = readCachedPlayback(playbackCacheRef.current, cacheKey);
      if (cached?.kind === "device") {
        playDeviceVoice(index, text, presentation);
        return;
      }
      const request = ++requestRef.current;
      setLoadingIndex(index);
      void (async () => {
        try {
          let blob = cached?.kind === "audio" ? cached.blob : null;
          if (!blob) {
            const response = await fetch("/api/ai/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, voice })
            });
            if (!response.ok) {
              throw new Error("Server synthesis unavailable.");
            }
            blob = await response.blob();
            if (requestRef.current !== request) return;
            storeCachedPlayback(playbackCacheRef.current, cacheKey, {
              kind: "audio",
              blob,
              expiresAt: Date.now() + TTS_CACHE_TTL_MS
            });
          }
          if (requestRef.current !== request) return;
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          element.src = url;
          playingForRef.current = index;
          deviceVoiceRef.current = false;
          // The element may still refuse this blob (blocked by policy,
          // unsupported codec); until play() settles that is recoverable, so an
          // error event must not also surface a playback failure.
          recoverableRef.current = true;
          await element.play();
          recoverableRef.current = false;
          if (requestRef.current !== request) return;
          setLoadingIndex(null);
          setPlayingIndex(index);
        } catch {
          recoverableRef.current = false;
          setLoadingIndex(null);
          // Stopped or superseded while the request was in flight — the user
          // asked for silence, not for the device voice.
          if (requestRef.current !== request) return;
          storeCachedPlayback(playbackCacheRef.current, cacheKey, {
            kind: "device",
            expiresAt: Date.now() + TTS_FALLBACK_CACHE_TTL_MS
          });
          playDeviceVoice(index, text, presentation);
        }
      })();
    },
    [playDeviceVoice, stop]
  );

  return { loadingIndex, playingIndex, unsupported, errorIndex, usingDeviceVoice, toggle, stop };
}

/** Support never changes mid-session, so there is nothing to subscribe to. */
function subscribeToNothing() {
  return () => {};
}

/** SSR-safe check for any playback path; stable across a page's lifetime. */
function playbackSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Audio === "function" || "speechSynthesis" in window;
}
