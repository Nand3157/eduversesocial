"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const LOOP_RESTART_DELAY_MS = 1000;

interface TypewriterTextProps {
  children: string;
  className?: string;
  loop?: boolean;
  /** Typing speed in ms per character */
  speed?: number;
}

// Adapted from SmoothUI's TypewriterText (MIT). Shows the full text
// immediately when the user prefers reduced motion.
export function TypewriterText({
  children,
  speed = 50,
  loop = false,
  className = ""
}: TypewriterTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState("");
  const [prevChildren, setPrevChildren] = useState(children);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (prevChildren !== children || (shouldReduceMotion && displayed !== children)) {
    setPrevChildren(children);
    setDisplayed(shouldReduceMotion ? children : "");
  }

  useEffect(() => {
    if (shouldReduceMotion) return;
    let cancelled = false;
    let index = 0;

    function type() {
      if (cancelled) return;
      setDisplayed(children.slice(0, index + 1));
      if (index < children.length - 1) {
        index++;
        timeout.current = setTimeout(type, speed);
      } else if (loop) {
        timeout.current = setTimeout(() => {
          index = 0;
          type();
        }, LOOP_RESTART_DELAY_MS);
      }
    }
    type();
    return () => {
      cancelled = true;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [children, speed, loop, shouldReduceMotion]);

  return <span className={className}>{displayed}</span>;
}