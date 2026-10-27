/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#FAF9F5',
        sidebar: '#F4F3EE',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#C15F3C',
          action: '#B65333',
          hover: '#A84E31',
          light: '#F5EBE6',
        },
        accent: {
          DEFAULT: '#D97757',
          hover: '#C96545',
        },
        text: {
          DEFAULT: '#141413',
          secondary: '#625F59',
          muted: '#8A867D',
        },
        border: {
          DEFAULT: '#E8E6DC',
          dark: '#D5D2C5',
        },
        status: {
          success: '#476B3C',
          info: '#2F5C83',
          warning: '#996000',
          danger: '#B42318',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
};
