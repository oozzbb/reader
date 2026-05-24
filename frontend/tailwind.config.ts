import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        surface: {
          DEFAULT: "#ffffff",
          dark: "#1e293b",
        },
        bg: {
          DEFAULT: "#fafafa",
          dark: "#0f172a",
        },
      },
      maxWidth: {
        reader: "680px",
      },
    },
  },
  plugins: [],
} satisfies Config;
