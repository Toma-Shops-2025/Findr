/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        ink: {
          950: "#07070c",
          900: "#0d0d14",
          800: "#15151f",
          700: "#1e1e2b",
          600: "#2a2a3a",
        },
        mint: {
          300: "#9fffe0",
          400: "#3dffc8",
          500: "#12e0a8",
        },
        flare: {
          400: "#ff6b9d",
          500: "#ff3d7a",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(61, 255, 200, 0.18)",
      },
    },
  },
  plugins: [],
};
