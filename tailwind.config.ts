import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sentinel: {
          black: "#050505",
          panel: "#111111",
          line: "#2a2a2a",
          white: "#f8f8f8",
          muted: "#a3a3a3",
          green: "#38f2a4"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(56,242,164,0.12)"
      }
    },
  },
  plugins: [],
};
export default config;
