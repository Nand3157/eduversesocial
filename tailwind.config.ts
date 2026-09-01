import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        card: "rgb(var(--surface-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-muted-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        primary: "rgb(var(--accent-rgb) / <alpha-value>)",
        "primary-strong": "rgb(var(--accent-strong-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-soft": "var(--accent-soft)",
        success: "rgb(var(--ok-rgb) / <alpha-value>)",
        warning: "rgb(var(--warn-rgb) / <alpha-value>)",
        danger: "rgb(var(--bad-rgb) / <alpha-value>)",
        mutedText: "rgb(var(--muted-rgb) / <alpha-value>)",
        faintText: "rgb(var(--faint-rgb) / <alpha-value>)",
        borderSoft: "rgb(var(--line-rgb) / <alpha-value>)"
      },
      borderRadius: {
        xl: "16px"
      },
      boxShadow: {
        glow: "var(--shadow-soft)",
        glass: "var(--shadow-lift)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      keyframes: {
        sheen: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" }
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        sheen: "sheen 2.2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        pulseLine: "pulseLine 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
