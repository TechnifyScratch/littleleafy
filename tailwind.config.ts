import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f2fbf3",
          100: "#dbf5de",
          300: "#8de09a",
          500: "#42bd61",
          700: "#25843e",
        },
        lilac: {
          50: "#faf7ff",
          100: "#f0e7ff",
          300: "#c8a9ff",
          500: "#8e5cf5",
          700: "#6331c9",
        },
        cream: "#fffdf6",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(63, 50, 91, 0.12)",
        press: "0 5px 0 rgba(77, 54, 128, 0.24)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sprout: {
          "0%, 100%": { transform: "translateY(0) rotate(-8deg)" },
          "50%": { transform: "translateY(-5px) rotate(8deg)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.025)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms ease-out both",
        sprout: "sprout 900ms ease-in-out infinite",
        pop: "pop 420ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
