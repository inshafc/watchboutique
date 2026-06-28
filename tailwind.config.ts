import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      colors: {
        cream:           '#F7F6F3',
        card:            '#FFFFFF',
        sidebar:         '#111111',
        gold:            '#C9A84C',
        'gold-light':    '#E8D5A3',
        'text-primary':  '#111111',
        'text-secondary':'#6B6B6B',
        'text-muted':    '#9CA3AF',
        border:          '#E8E6E1',
        positive:        '#16A34A',
        negative:        '#DC2626',
      },
    },
  },
  plugins: [],
};
export default config;
