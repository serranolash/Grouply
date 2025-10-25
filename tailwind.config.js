/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f0ff',
          500: '#2AA4F4',
          600: '#178bd8',
          800: '#0b4e86'
        }
      }
    },
  },
  plugins: [],
}
