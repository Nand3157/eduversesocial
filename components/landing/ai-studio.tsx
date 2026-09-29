"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowRight, AudioLines, BookOpenCheck, Check, ChevronRight, FileText, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";

const examples = [
  {
    prompt: "What should I post next?",
    answer: "Try a short concept carousel that answers one question learners asked this week. It gives the idea room to build, then leaves a clear point for people to save.",
    evidence: "Format pattern · saved posts",
    action: "Draft a carousel outline",
    icon: BookOpenCheck
  },
  {
    prompt: "Why did this post connect?",
    answer: "The post paired a familiar classroom problem with a simple visual explanation. The strongest response came from the comments and saves, which suggests the example felt useful beyond the first read.",
    evidence: "Post signals · comments + saves",
    action: "Turn the idea into a series",
    icon: FileText
  },
  {
    prompt: "Find a better time to share it",
    answer: "Your workspace history points to a midweek evening window for this audience. Compare the same format across a few weeks, then keep the time that holds up in your own results.",
    evidence: "Publishing history · time window",
    action: "Plan the next post",
    icon: AudioLines
  }
];

export function AiStudio() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = examples[activeIndex];
  const ActionIcon = active.icon;

  return (
    <section className="ai-studio-section" aria-labelledby="ai-studio-heading">
      <div className="landing-wrap ai-studio-grid">
        <div className="ai-studio-copy">
          <p className="ai-studio-kicker"><Sparkles aria-hidden="true" /> THE EDUVERSE AI STUDIO</p>
          <h2 id="ai-studio-heading">A useful answer starts with what your audience already told you.</h2>
          <p className="ai-studio-description">Ask about a post, a pattern, or what to make next. EduVerse brings your connected workspace context into the conversation, then shows the signal behind the suggestion.</p>
          <div className="ai-studio-points">
            <p><Check aria-hidden="true" /> Grounded in your workspace history</p>
            <p><Check aria-hidden="true" /> Sources stay attached to the answer</p>
            <p><Check aria-hidden="true" /> Built for the next post, not another report</p>
          </div>
          <Link href="/dashboard/chat" className="ai-studio-link">Explore the AI assistant <ArrowRight aria-hidden="true" /></Link>
          <div className="ai-studio-footnote"><span className="ai-studio-footnote-mark">i</span> The conversation shown is illustrative. Live answers require a connected workspace.</div>
        </div>

        <div className="ai-studio-visual">
          <div className="ai-studio-orbit" aria-hidden="true"><i /><i /><i /></div>
          <div className="ai-window" aria-label="Illustrative EduVerse AI conversation">
            <div className="ai-window-topbar">
              <div className="ai-window-brand"><span className="ai-window-brand-icon"><WandSparkles aria-hidden="true" /></span><span><strong>EduVerse AI</strong><small>Audience context connected</small></span></div>
              <span className="ai-window-status"><i /> SAMPLE</span>
            </div>
            <div className="ai-window-context"><span><span className="ai-context-dot ai-context-instagram" /> Instagram</span><span><span className="ai-context-dot ai-context-facebook" /> Facebook</span><span><span className="ai-context-dot ai-context-threads" /> Threads</span><span className="ai-context-divider" /><span>Workspace memory</span></div>
            <div className="ai-window-chat">
              <div className="ai-window-date">A SAMPLE CONVERSATION</div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeIndex}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : .18, ease: [0.16, 1, 0.3, 1] }}
                  className="ai-window-exchange"
                >
                  <div className="ai-user-message">{active.prompt}</div>
                  <div className="ai-assistant-row"><span className="ai-assistant-avatar"><Sparkles aria-hidden="true" /></span><div className="ai-assistant-message"><p>{active.answer}</p><div className="ai-answer-evidence"><span className="ai-evidence-check"><Check aria-hidden="true" /></span><span><small>WHY THIS?</small><strong>{active.evidence}</strong></span><ChevronRight aria-hidden="true" /></div></div></div>
                  <div className="ai-suggested-action"><ActionIcon aria-hidden="true" /><span>{active.action}</span><ArrowDownRight aria-hidden="true" /></div>
                </motion.div>
              </AnimatePresence>
              <div className="ai-window-prompts" aria-label="Choose a sample question">
                {examples.map((example, index) => (
                  <button key={example.prompt} type="button" aria-pressed={activeIndex === index} onClick={() => setActiveIndex(index)}>
                    {example.prompt}
                  </button>
                ))}
              </div>
              <div className="ai-window-input" aria-hidden="true"><span>Ask about your audience…</span><span className="ai-window-send"><ArrowRight /></span></div>
              <p className="ai-window-disclaimer">Illustrative interface · no account data shown</p>
            </div>
          </div>
          <div className="ai-floating-note ai-floating-note-top"><span className="ai-note-wave"><i /><i /><i /><i /><i /></span> REMEMBERS WHAT RESONATED</div>
          <div className="ai-floating-note ai-floating-note-bottom"><span className="ai-note-pulse" /> Answers with a reason attached</div>
        </div>
      </div>
    </section>
  );
}
