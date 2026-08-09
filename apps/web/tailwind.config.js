/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aesthetic custom colors
        hiking: {
          dark: "#121824",
          card: "#1e293b",
          primary: "#10b981", // emerald
          accent: "#f59e0b", // amber
        }
      }
    },
  },
  plugins: [],
}
