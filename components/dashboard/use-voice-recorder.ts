"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "requesting" | "recording" | "processing" | "unsupported" | "denied" | "error";

export type VoiceRecorder = {
  state: VoiceRecorderState;
  /**
   * Subscribe to the live input level (0..1). Called from the recorder's rAF
   * loop OUTSIDE React render — listeners must write straight to the DOM
   * (never setState) or the whole chat tree re-reconciles every frame.
   * Returns an unsubscribe function.
   */
  onLevel: (listener: (level: number) => void) => () => void;
  seconds: number;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
};

const MAX_SECONDS = 60;

type AudioContextCtor = new (contextOptions?: AudioContextOptions) => AudioContext;

export function useVoiceRecorder(onClip: (audioDataUrl: string) => void): VoiceRecorder {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);

  // Latest amplitude lives in a ref, not state: the meter reads it 60×/sec
  // and must not re-render ChatInterface (and every message) per frame.
  const levelRef = useRef(0);
  const levelListenersRef = useRef<Set<(level: number) => void>>(new Set());
  const emitLevel = useCallback((value: number) => {
    levelRef.current = value;
    for (const listener of levelListenersRef.current) listener(value);
  }, []);
  const onLevel = useCallback((listener: (level: number) => void) => {
    levelListenersRef.current.add(listener);
    return () => {
      levelListenersRef.current.delete(listener);
    };
  }, []);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const onClipRef = useRef(onClip);
  useEffect(() => {
    onClipRef.current = onClip;
  }, [onClip]);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    emitLevel(0);
  }, [emitLevel]);

  useEffect(() => {
    // The set itself is stable (never reassigned); copy it so the cleanup
    // doesn't read a ref value at unmount time.
    const listeners = levelListenersRef.current;
    return () => {
      cleanup();
      listeners.clear();
    };
  }, [cleanup]);

  const tick = useCallback(() => {
    setSeconds((current) => {
      if (current + 1 >= MAX_SECONDS) {
        // Auto-stop at the cap so recordings cannot grow unbounded.
        recorderRef.current?.stop();
        return MAX_SECONDS;
      }
      return current + 1;
    });
  }, []);

  const start = useCallback(async () => {
    if (state === "recording" || state === "requesting" || state === "processing") return;
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("unsupported");
      return;
    }
    cancelledRef.current = false;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = typeof MediaRecorder.isTypeSupported === "function"
        ? mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type))
        : undefined;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanup();
        setState("idle");
        setSeconds(0);
        if (wasCancelled || blob.size === 0) return;
        const reader = new FileReader();
        reader.onload = () => onClipRef.current(reader.result as string);
        reader.readAsDataURL(blob);
      };

      recorder.start();

      // Live input meter: RMS of the analyser buffer drives the waveform bar.
      const AudioContextCtor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as AudioContextCtor | undefined;
      if (AudioContextCtor) {
        try {
          const context = new AudioContextCtor();
          audioContextRef.current = context;
          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;
          const buffer = new Uint8Array(analyser.fftSize);
          const meter = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i += 1) {
              const centered = (buffer[i] - 128) / 128;
              sum += centered * centered;
            }
            emitLevel(Math.min(1, Math.sqrt(sum / buffer.length) * 3));
            rafRef.current = requestAnimationFrame(meter);
          };
          rafRef.current = requestAnimationFrame(meter);
        } catch {
          // Metering is cosmetic; recording still works without it.
        }
      }

      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(tick, 1_000);
    } catch (error) {
      cleanup();
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setState(denied ? "denied" : "error");
    }
  }, [cleanup, emitLevel, state, tick]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      setState("processing");
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else {
      cleanup();
      setState("idle");
      setSeconds(0);
    }
  }, [cleanup]);

  const reset = useCallback(() => {
    setState("idle");
    setSeconds(0);
    emitLevel(0);
  }, [emitLevel]);

  return { state, onLevel, seconds, start, stop, cancel, reset };
}
