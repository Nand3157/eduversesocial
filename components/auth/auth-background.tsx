"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Brain, Sparkles } from "lucide-react";

export function AuthBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="auth-scene">
      <motion.div className="auth-orb auth-orb-one" animate={reduceMotion ? undefined : { x: [0, 30, -18, 0], y: [0, -22, 18, 0], scale: [1, 1.08, 0.96, 1] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="auth-orb auth-orb-two" animate={reduceMotion ? undefined : { x: [0, -26, 16, 0], y: [0, 22, -14, 0], scale: [1, 0.94, 1.08, 1] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      <div className="auth-planet">
        <motion.div className="auth-planet-core" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }}><Sparkles className="h-7 w-7" /></motion.div>
        <span className="auth-planet-ring auth-planet-ring-one" />
        <span className="auth-planet-ring auth-planet-ring-two" />
      </div>
      <motion.div className="auth-float-card auth-float-card-one" animate={reduceMotion ? undefined : { y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><Brain className="h-4 w-4 text-primary" /><span>Audience memory</span></motion.div>
      <motion.div className="auth-float-card auth-float-card-two" animate={reduceMotion ? undefined : { y: [0, 10, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}><BookOpen className="h-4 w-4 text-success" /><span>Learn from every signal</span></motion.div>
    </div>
  );
}
