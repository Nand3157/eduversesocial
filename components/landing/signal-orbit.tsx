"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight, BarChart3, Bookmark, BrainCircuit, Clock3, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

const lenses = [
  { id: "signal", label: "Signal", value: "Saves + replies", note: "What people chose to keep", icon: BarChart3 },
  { id: "memory", label: "Memory", value: "The useful pattern", note: "A reason that stays with the post", icon: BrainCircuit },
  { id: "next", label: "Next move", value: "A grounded idea", note: "One clear action to try next", icon: Sparkles }
] as const;

export function SignalOrbit() {
  const [active, setActive] = useState<(typeof lenses)[number]["id"]>("memory");
  const boundsRef = useRef<DOMRect | null>(null);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(pointerY, { stiffness: 190, damping: 28, mass: 0.35 });
  const rotateY = useSpring(pointerX, { stiffness: 190, damping: 28, mass: 0.35 });
  const selected = lenses.find((item) => item.id === active) ?? lenses[1];
  const SelectedIcon = selected.icon;

  const handlePointerEnter = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    boundsRef.current = event.currentTarget.getBoundingClientRect();
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const bounds = boundsRef.current;
    if (!bounds) return;
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 5);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -4);
  }, [pointerX, pointerY, reduceMotion]);

  const resetPointer = useCallback(() => {
    boundsRef.current = null;
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  return (
    <div className="signal-orbit-wrap">
      <div className="signal-orbit-label"><span className="signal-orbit-label-dot" /> A SAMPLE WORKSPACE, IN THREE DIMENSIONS</div>
      <motion.div
        className="signal-orbit-scene signal-stack-scene"
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: "preserve-3d" }}
      >
        <div className="signal-stack-backdrop" aria-hidden="true"><span /><span /><span /></div>
        <div className="signal-post-card signal-post-back signal-post-facebook">
          <div className="signal-post-meta"><span className="signal-network-mark">f</span><span>FACEBOOK · SAMPLE</span></div>
          <p>A question from a learner became tomorrow’s lesson.</p>
          <div className="signal-post-reactions"><MessageCircle /> 18 thoughtful replies</div>
        </div>
        <div className="signal-post-card signal-post-back signal-post-threads">
          <div className="signal-post-meta"><span className="signal-network-mark">@</span><span>THREADS · SAMPLE</span></div>
          <p>One small explanation. A bigger conversation.</p>
          <div className="signal-post-reactions"><MessageCircle /> Follow-up questions</div>
        </div>
        <div className="signal-post-card signal-post-front">
          <div className="signal-post-meta"><span className="signal-network-mark signal-network-instagram">◎</span><span>INSTAGRAM · SAMPLE POST</span><span className="signal-post-menu">•••</span></div>
          <div className="signal-post-art"><div className="signal-post-art-orbit" /><span>one idea<br /><em>made clear.</em></span><i /><i /><i /></div>
          <div className="signal-post-actions"><span><span>♡</span> 246</span><span><MessageCircle /> 32</span><span><Bookmark /> 81</span></div>
          <p className="signal-post-caption"><strong>Teach one useful thing.</strong> A clear example gives people something to come back to.</p>
        </div>
        <div className="signal-connection signal-connection-one" aria-hidden="true" />
        <div className="signal-evidence-card">
          <span className="signal-evidence-icon"><SelectedIcon aria-hidden="true" /></span>
          <span><small>{selected.label.toUpperCase()}</small><strong>{selected.value}</strong><em>{selected.note}</em></span>
          <ArrowRight className="signal-evidence-arrow" aria-hidden="true" />
        </div>
        <span className="signal-stage-caption">POST <i /> RESPONSE <i /> REASON</span>
      </motion.div>
      <div className="signal-lens-controls" role="group" aria-label="Explore the audience signal story">
        {lenses.map((lens) => (
          <button key={lens.id} type="button" aria-pressed={active === lens.id} onClick={() => setActive(lens.id)}>
            <span>{lens.label}</span><i aria-hidden="true" />
          </button>
        ))}
        <Link href="/demo" aria-label="Explore the product demo"><ArrowRight aria-hidden="true" /></Link>
      </div>
      <p className="signal-orbit-footer"><span><Clock3 aria-hidden="true" /> Illustrative interactions · not live account data</span><span>Move your pointer or choose a step</span></p>
    </div>
  );
}
