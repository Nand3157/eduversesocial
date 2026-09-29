"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bookmark, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

const moments = [
  { id: "listen", label: "Listen", title: "A learner question drew thoughtful replies.", detail: "Bring comments, saves, and reach together across your connected channels.", source: "Audience response", icon: MessageCircle },
  { id: "remember", label: "Remember", title: "People saved the clear example.", detail: "Keep the useful pattern attached to the post that earned it.", source: "Post memory", icon: Bookmark },
  { id: "next", label: "Next move", title: "Try one short, example-led carousel.", detail: "A recommendation with its source and reasoning still in view.", source: "Grounded suggestion", icon: Sparkles }
] as const;

export function MemoryTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const moment = moments[activeIndex];
  const MomentIcon = moment.icon;

  return (
    <section className="memory-timeline-section" aria-labelledby="memory-timeline-heading">
      <div className="landing-wrap journey-layout">
        <div className="journey-story">
          <p className="memory-timeline-kicker">A CLEAR REASON FOR WHAT COMES NEXT</p>
          <h2 id="memory-timeline-heading">Make each post teach you something.</h2>
          <p className="journey-summary">Follow one idea from audience response to a recommendation you can explain.</p>
          <div className="journey-step-controls" role="group" aria-label="Explore the audience memory steps">
            {moments.map((item, index) => (
              <button key={item.id} type="button" aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)}>
                <span>{item.label}</span><i aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="journey-hint">Choose a step to see how the story changes.</p>
        </div>

        <motion.div className="journey-stage" whileHover={reduceMotion ? undefined : { y: -3 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
          <div className="journey-depth-rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="journey-layer" aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={moment.id}
              className="journey-focus-card"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -3, transition: { duration: 0.13, ease: "easeIn" } }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="journey-focus-top"><span className="journey-focus-symbol"><MomentIcon aria-hidden="true" /></span><span>WORKSPACE MEMORY <i>·</i> SAMPLE</span><span className="journey-focus-more">•••</span></div>
              <div className="journey-focus-content"><small>{moment.source.toUpperCase()}</small><h3>{moment.title}</h3><p>{moment.detail}</p></div>
              <div className="journey-source-row"><span><i className="journey-source-ig" /> Instagram</span><span><i className="journey-source-fb" /> Facebook</span><span><i className="journey-source-th" /> Threads</span></div>
            </motion.article>
          </AnimatePresence>
          <div className="journey-stage-footer"><span>ILLUSTRATIVE · NOT LIVE ACCOUNT DATA</span><Link href="/demo">See the demo <ArrowRight aria-hidden="true" /></Link></div>
        </motion.div>
      </div>
    </section>
  );
}
