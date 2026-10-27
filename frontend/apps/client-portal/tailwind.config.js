/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@business-os/design-tokens/tailwind-preset')],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [],
};
