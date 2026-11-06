/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        airtel: {
          red: '#E40000',
          'red-dark': '#B30000',
          'red-light': '#FF3333',
          charcoal: '#1a1a2e',
          'charcoal-mid': '#16213e',
          'charcoal-light': '#0f3460',
          white: '#FFFFFF',
          gray: '#f4f4f8',
          'gray-dark': '#6b7280',
          'gray-border': '#e5e7eb',
        },
        risk: {
          low: '#22c55e',
          moderate: '#eab308',
          high: '#f97316',
          critical: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
