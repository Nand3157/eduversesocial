"use client";

import { useCallback, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TiltCardProps {
  /** Maximum tilt angle in degrees */
  tiltLimit?: number;
  /** Scale factor on hover */
  scale?: number;
  /** Perspective distance in pixels */
  perspective?: number;
  /** Tilt direction: "gravitate" follows cursor, "evade" tilts away */
  effect?: "gravitate" | "evade";
  /** Show a spotlight that follows the cursor on hover */
  spotlight?: boolean;
  /** Framer-motion variants (e.g. for stagger containers) */
  variants?: Variants;
  /** Additional class name */
  className?: string;
  /** Card content */
  children?: React.ReactNode;
}

// Spring-smoothed 3D tilt card with a cursor spotlight. Motion values are
// rAF-backed, so tilting never triggers React re-renders, and the whole effect
// is skipped when the user prefers reduced motion.
export function TiltCard({
  tiltLimit = 12,
  scale = 1.03,
  perspective = 1100,
  effect = "gravitate",
  spotlight = true,
  variants,
  className,
  children
}: TiltCardProps) {
  const reduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);
  const spring = { stiffness: 220, damping: 18, mass: 0.5 };
  const sx = useSpring(rotateX, spring);
  const sy = useSpring(rotateY, spring);
  const dir = effect === "evade" ? -1 : 1;

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      rotateX.set((py - 0.5) * tiltLimit * 2 * dir);
      rotateY.set((px - 0.5) * -tiltLimit * 2 * dir);
      spotX.set(px * 100);
      spotY.set(py * 100);
    },
    [reduceMotion, tiltLimit, dir, rotateX, rotateY, spotX, spotY]
  );

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return (
    <motion.div
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: perspective, transformStyle: "preserve-3d" }}
      transition={spring}
      variants={variants}
      whileHover={reduceMotion ? undefined : { scale }}
      className={cn("relative will-change-transform", className)}
    >
      {children}
      {spotlight && (
        <motion.div
          aria-hidden="true"
          animate={{ opacity: isHovered && !reduceMotion ? 1 : 0 }}
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
          initial={false}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="absolute h-[160%] w-[160%] rounded-full"
            style={{
              left: spotX,
              top: spotY,
              x: "-50%",
              y: "-50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 45%)"
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}