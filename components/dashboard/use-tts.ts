"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseTts = {
  /** Message index currently loading audio (fetch in flight). */
  loadingIndex: number | null;
  /** Message index currently playing. */
  playingIndex: number | null;
  /** True when the browser cannot play audio (no <audio> support). */
  unsupported: boolean;
  /** Message index that failed last (error surfaced per message). */
  errorIndex: number | null;
  /** Toggle play/stop for a message. Only one clip plays at a time. */
  toggle: (index: number, text: string) => void;
  /** Stop playback and clear pending audio. */
  stop: () => void;
};

/** SSR-safe check for <audio> support; stable across a page's lifetime. */
function audioSupported(): boolean {
  return typeof window !== "undefined" && typeof window.Audio === "function";
}

/**
 * Read-aloud playback for assistant messages. Audio is fetched from
 * /api/ai/tts (Gemini 3.8 Flash-Lite TTS) as a WAV blob and played through a
 * single reusable <audio> element, so only one reply is ever audible and
 * switching messages tears down the previous clip.
 */
export function useTts(): UseTts {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  // Computed during render: browser audio support is stable for the page's
  // lifetime, so this never needs to be state.
  const unsupported = !audioSupported();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingForRef = useRef<number | null>(null);

  useEffect(() => {
    if (unsupported) return;
    const element = new Audio();
    element.preload = "auto";
    const onEnded = () => {
      setPlayingIndex(null);
      playingForRef.current = null;
    };
    const onError = () => {
      if (playingForRef.current !== null) {
        setErrorIndex(playingForRef.current);
        setPlayingIndex(null);
        playingForRef.current = null;
      }
    };
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    audioRef.current = element;
    return () => {
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
      element.pause();
      element.src = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [unsupported]);

  const stop = useCallback(() => {
    const element = audioRef.current;
    if (element) {
      element.pause();
      element.removeAttribute("src");
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    playingForRef.current = null;
    setPlayingIndex(null);
  }, []);

  const toggle = useCallback(
    (index: number, text: string) => {
      const element = audioRef.current;
      if (!element) return;
      setErrorIndex(null);
      // Second click on the playing message stops it.
      if (playingForRef.current === index) {
        stop();
        return;
      }
      // Switching messages stops whatever is currently playing first.
      stop();
      setLoadingIndex(index);
      void (async () => {
        try {
          const response = await fetch("/api/ai/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Could not generate the audio.");
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          element.src = url;
          playingForRef.current = index;
          await element.play();
          setLoadingIndex(null);
          setPlayingIndex(index);
        } catch {
          setLoadingIndex(null);
          setErrorIndex(index);
          playingForRef.current = null;
        }
      })();
    },
    [stop]
  );

  return { loadingIndex, playingIndex, unsupported, errorIndex, toggle, stop };
}
