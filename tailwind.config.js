/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  // The app uses dynamically-built class names like `bg-${color}-100` for
  // guide icons/badges, which Tailwind's static content scan can't see.
  // Safelisting the palette keeps those classes in the generated CSS.
  safelist: [
    {
      pattern: /(bg|text)-(blue|red|orange|sky|amber|slate|yellow)-(100|600)/,
    },
  ],
  plugins: [],
};
