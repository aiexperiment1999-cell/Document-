import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f6",
          100: "#d9f0e7",
          200: "#b3e0cf",
          500: "#1b7f5c",
          600: "#146449",
          700: "#0f4d38",
        },
      },
    },
  },
  plugins: [],
};

export default config;
