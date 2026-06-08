/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a2744',
          light: '#243460',
          50: '#f0f3fa',
          100: '#d8e0f0',
          200: '#b0c0e0',
          700: '#1a2744',
          800: '#121d33',
        },
        gold: {
          DEFAULT: '#c8901a',
          light: '#e8a020',
          50: '#fef9ec',
          100: '#fdefc4',
          400: '#f5b020',
          500: '#c8901a',
          600: '#a87215',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

