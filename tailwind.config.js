/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace']
      },
      colors: {
        primary: '#22223B',
        accent: '#9A8C98',
        mosaic: '#C9ADA7',
        tile: '#4A4E69',
        tileHover: '#F2E9E4'
      }
    },
  },
  plugins: [],
}
