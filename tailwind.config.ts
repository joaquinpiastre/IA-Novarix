import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        novarix: {
          bg: "#0A0118",
          card: "#2D0A5E",
          mid: "#4A1A9E",
          accent: "#7B2FF7",
          highlight: "#A855F7",
          magenta: "#C026D3",
          muted: "#7C6FAE",
          secondary: "#C4B5FD",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "12px",
        input: "8px",
        badge: "6px",
      },
    },
  },
  plugins: [],
};
export default config;
