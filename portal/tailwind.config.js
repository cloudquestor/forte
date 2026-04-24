/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf6ee',
          100: '#fae8d0',
          200: '#f5cfa0',
          300: '#efb06a',
          400: '#e8903a',
          500: '#c8621a',
          600: '#a34d14',
          700: '#7e3b10',
          800: '#5c2b0c',
          900: '#3b1b07',
        },
      },
    },
  },
  plugins: [],
}
