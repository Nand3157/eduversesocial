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
        background: "var(--background)",
        card: "var(--surface)",
        surface: "var(--surface-muted)",
        ink: "var(--ink)",
        primary: "var(--accent)",
        "primary-strong": "var(--accent-strong)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        success: "var(--ok)",
        warning: "var(--warn)",
        danger: "var(--bad)",
        mutedText: "var(--muted)",
        faintText: "var(--faint)",
        borderSoft: "var(--line)"
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
