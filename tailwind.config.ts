import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "tt-bg":      "#FFFFFF",
        "tt-bg-alt":  "#F7F6F4",
        "tt-dark":    "#0D0D0D",
        "tt-text":    "#0D0D0D",
        "tt-muted":   "#6B6B6B",
        "tt-faint":   "#ABABAB",
        "tt-accent":  "#1A56DB",
        "tt-risk":    "#C0392B",
        "tt-caution": "#D97706",
        "tt-ok":      "#1A7A4A",
        "tt-border":  "#E8E8E8",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        body:    ['"DM Sans"', "system-ui", "sans-serif"],
        mono:    ['"DM Mono"', '"Courier New"', "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
      },
      maxWidth: {
        "tt-container": "1200px",
      },
      spacing: {
        "tt-pad": "48px",
        "tt-pad-m": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
