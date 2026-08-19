"use client";

import { motion } from "framer-motion";

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-mutedText">{description}</p>
    </motion.div>
  );
}
