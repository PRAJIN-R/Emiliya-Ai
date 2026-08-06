/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        slatebg: "#0b1220",
        card: "#111a2d",
        accent: "#12b886",
      },
    },
  },
  plugins: [],
};
