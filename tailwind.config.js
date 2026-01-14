/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#1a1a1a',
        primary: '#d4af37',
        'primary-hover': '#b5952f',
        secondary: '#006400',
        text: '#ffffff',
        'text-muted': '#a1a1aa',
      },
    },
  },
  plugins: [],
}
