const { themeColors } = require("./theme.config");
const plugin = require("tailwindcss/plugin");

const tailwindColors = Object.fromEntries(
  Object.entries(themeColors).map(([name, swatch]) => [
    name,
    {
      DEFAULT: `var(--color-${name})`,
      light: swatch.light,
      dark: swatch.dark,
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // Scan all component and app files for Tailwind classes
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./lib/**/*.{js,ts,tsx}", "./hooks/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        // Serif - elegant headings
        serif: ["PlayfairDisplay", "serif"],
        "serif-bold": ["PlayfairDisplay-Bold", "serif"],
        // Sans-serif - readable body text
        sans: ["Inter", "system-ui", "sans-serif"],
        "sans-medium": ["Inter-Medium", "system-ui", "sans-serif"],
        // Handwritten - personal notes
        handwritten: ["Caveat", "cursive"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", ':root:not([data-theme="dark"]) &');
      addVariant("dark", ':root[data-theme="dark"] &');
    }),
  ],
};
