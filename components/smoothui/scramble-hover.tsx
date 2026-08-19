"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?";

function scrambleText(original: string) {
  return original
    .split("")
    .map((char) =>
      char === " "
        ? " "
        : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
    )
    .join("");
}

function useMediaQuery(query: string) {
  const subscribe = (onStoreChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  };
  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface ScrambleHoverProps {
  children: string;
  className?: string;
  /** Total animation duration in ms */
  duration?: number;
  /** Interval between scrambles in ms */
  speed?: number;
}

// Adapted from SmoothUI's ScrambleHover (MIT): rendered as a span so it can
// live inside buttons and links. Skipped entirely on touch devices and when
// the user prefers reduced motion.
export function ScrambleHover({
  children,
  duration = 600,
  speed = 30,
  className = ""
}: ScrambleHoverProps) {
  const [display, setDisplay] = useState(children);
  const shouldReduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isHoverDevice = useMediaQuery("(hover: hover) and (pointer: fine)");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prevChildren, setPrevChildren] = useState(children);

  if (prevChildren !== children) {
    setPrevChildren(children);
    setDisplay(children);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleEnter = () => {
    if (shouldReduceMotion || !isHoverDevice) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = setInterval(() => setDisplay(scrambleText(children)), speed);
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(children);
    }, duration);
  };

  const handleLeave = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplay(children);
  };

  return (
    <span
      className={className}
      onBlur={handleLeave}
      onFocus={handleEnter}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {display}
    </span>
  );
}