"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "theme";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Local replacement for next-themes: the library renders a <script> inside a
// client component, which React 19 flags ("Encountered a script tag while
// rendering React component"). Theme init moves to a head script in the root
// layout; this provider only owns the class toggle and the toggle UI state.
const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => undefined
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server render and the first client render both resolve to "dark", so the
  // initial DOM (and hydration) is deterministic; stored/system preference is
  // applied in an effect right after mount — same flash-free flow as before.
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode): fall through to system preference.
    }
    const initial: Theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    // One-time sync from an external source (localStorage) on mount. The
    // server and first client render both resolve to "dark" (matching the
    // head script), so this only updates state after hydration — no mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    setResolvedTheme(initial === "system" ? (systemPrefersDark() ? "dark" : "light") : initial);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next) => {
        setThemeState(next);
        setResolvedTheme(next === "system" ? (systemPrefersDark() ? "dark" : "light") : next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Ignore storage failures; the theme still applies for this session.
        }
      }
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}