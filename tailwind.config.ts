import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        carbon: "#172027",
        paper: "#f7f8f5",
        line: "#dfe5df",
        signal: "#167a5a",
        risk: "#b0442f",
        amber: "#b7791f"
      },
      fontFamily: {
        sans: ["Geist", "Avenir Next", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "SFMono-Regular", "ui-monospace", "monospace"]
      },
      boxShadow: {
        soft: "0 24px 80px -46px rgba(16, 20, 24, 0.38)",
        insetline: "inset 0 1px 0 rgba(255,255,255,0.58)"
      }
    }
  },
  plugins: []
};

export default config;
