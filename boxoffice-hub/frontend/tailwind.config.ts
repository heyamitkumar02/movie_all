import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#09090B",
        "zinc-glass": "#121216",
        emerald: {
          DEFAULT: "#10B981",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        "amber-gold": {
          DEFAULT: "#F59E0B",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        rose: {
          DEFAULT: "#F43F5E",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-live": "pulse-live 2s ease-in-out infinite",
        shimmer: "shimmer 2.8s linear infinite",
        "aurora-one": "aurora-drift-one 18s ease-in-out infinite",
        "aurora-two": "aurora-drift-two 24s ease-in-out infinite",
        "aurora-three": "aurora-drift-three 21s ease-in-out infinite",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.92)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "aurora-drift-one": {
          "0%, 100%": { transform: "translate3d(0px, 0px, 0) scale(1)" },
          "50%": { transform: "translate3d(60px, -35px, 0) scale(1.12)" },
        },
        "aurora-drift-two": {
          "0%, 100%": { transform: "translate3d(0px, 0px, 0) scale(1)" },
          "50%": { transform: "translate3d(-70px, 40px, 0) scale(1.08)" },
        },
        "aurora-drift-three": {
          "0%, 100%": { transform: "translate3d(0px, 0px, 0) scale(1)" },
          "50%": { transform: "translate3d(35px, 50px, 0) scale(1.15)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
