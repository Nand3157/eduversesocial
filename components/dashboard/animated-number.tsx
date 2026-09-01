"use client";

import { animate, useInView, useMotionValue, useReducedMotion, useTransform, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Render the real value on first paint so screenshots, assistive tech, and
  // reduced-motion users never encounter a misleading zero placeholder.
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => {
    const precision = Number.isInteger(value) ? 0 : 1;
    const formatted = latest.toLocaleString("en-US", { maximumFractionDigits: precision, minimumFractionDigits: precision });
    return `${formatted}${suffix}`;
  });
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [inView, reduceMotion, count, value]);

  return (
    <motion.span ref={ref} className="tabular-nums">
      {rounded}
    </motion.span>
  );
}
