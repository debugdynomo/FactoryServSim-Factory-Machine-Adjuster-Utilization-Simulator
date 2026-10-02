/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'factory-navy': '#0f172a',
        'factory-steel': '#1e3a5f',
        'factory-slate': '#334155',
        'factory-amber': '#d97706',
        'factory-emerald': '#059669',
        'factory-red': '#dc2626',
        'factory-surface': '#f8fafc',
      },
    },
  },
  plugins: [],
}
