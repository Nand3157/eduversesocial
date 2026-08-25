"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/components/motion-variants";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return (
    <Button aria-label={isDark ? "Use light theme" : "Use dark theme"} onClick={() => setTheme(isDark ? "light" : "dark")} size="icon" variant="secondary">
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={isDark ? "sun" : "moon"}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
          initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="grid place-items-center"
        >
          {isDark ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}