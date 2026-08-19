"use client";

import type { MotionProps } from "framer-motion";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING = { type: "spring", stiffness: 400, damping: 17 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 22 } as const;
export const SPRING_SNAPPY = { type: "spring", stiffness: 500, damping: 30 } as const;

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.7, ease: EASE_OUT }
} satisfies MotionProps;

export const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" }
} satisfies MotionProps;

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } }
};

export const staggerItemFast = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }
};

export const hoverLift = {
  whileHover: { y: -4 },
  whileTap: { scale: 0.99 },
  transition: SPRING_SOFT
};

export const hoverLiftCard = {
  whileHover: { y: -6 },
  whileTap: { scale: 0.995 },
  transition: SPRING_SOFT
};
