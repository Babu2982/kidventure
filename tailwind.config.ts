import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: { kid: "#4FC3F7" },
        sun: "#FFD54F",
        grass: "#81C784",
        berry: "#F06292",
        grape: "#9575CD",
        cream: "#FFF8E7",
        tangerine: "#FF8A65",
      },
      fontFamily: {
        display: ["Fredoka", "Comic Sans MS", "system-ui", "sans-serif"],
        body: ["Quicksand", "Verdana", "system-ui", "sans-serif"],
      },
      boxShadow: {
        chunky: "0 6px 0 rgba(0,0,0,0.15)",
        chunkySm: "0 4px 0 rgba(0,0,0,0.12)",
      },
      borderRadius: { blob: "2rem" },
    },
  },
  plugins: [],
};
export default config;
