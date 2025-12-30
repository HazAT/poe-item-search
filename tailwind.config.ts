import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}", "./stories/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PoE theme colors from better-trading
        poe: {
          black: "#161616",
          gray: "#373737",
          "gray-alt": "#7a7a7a",
          white: "#ffffff",
          beige: "#fff8e1",
          blue: "#0f304d",
          "blue-alt": "#4c4c7d",
          gold: "#5a3806",
          "gold-alt": "#8a5609",
          red: "#5a0a09",
          "red-alt": "#6d2725",
          yellow: "#666521",
          "yellow-alt": "#7a7921",
          green: "#4b7e42",
          "green-alt": "#5e9954",
        },
      },
      fontFamily: {
        fontin: ["Cinzel", "serif"],
        body: ["Verdana", "Arial", "Helvetica", "sans-serif"],
      },
      width: {
        panel: "400px",
      },
      spacing: {
        "panel-x": "10px",
        "panel-y": "5px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-in": "slideIn 0.2s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
