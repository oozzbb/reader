import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1a1a1a",
          light: "#4a4a4a",
          muted: "#8a8a8a",
          faint: "#c8c8c8",
        },
        paper: {
          DEFAULT: "#fafaf8",
          warm: "#f5f3ef",
          dark: "#141414",
          "dark-surface": "#1e1e1e",
        },
        accent: {
          DEFAULT: "#2c5282",
          light: "#ebf2fa",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', '-apple-system', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        reader: "640px",
        content: "520px",
      },
      spacing: {
        "18": "4.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
