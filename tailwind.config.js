/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: '#D4A574',
        earth: '#8B6F5E',
        clay: '#A67C5B',
        wheat: '#BFA58A',
        stone: '#9B8572',
        parchment: '#e8e0d4',
        ink: '#0f0f0f',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
