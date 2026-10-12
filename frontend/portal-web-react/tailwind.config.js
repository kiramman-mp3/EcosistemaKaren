/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1D3557',
          dark: '#1E3A8A',
          deep: '#0F172A',
          surface: '#182C48'
        },
        karenRed: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          dark: '#B91C1C',
          accent: '#E63946',
          light: '#FEE2E2'
        },
        karenBg: '#F8FAFC'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(29, 53, 87, 0.08), 0 2px 6px -1px rgba(29, 53, 87, 0.04)',
        'card': '0 10px 30px -4px rgba(15, 23, 42, 0.07), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
        'glow-red': '0 4px 20px rgba(239, 68, 68, 0.35)',
        'glow-blue': '0 4px 20px rgba(30, 58, 138, 0.35)',
      }
    },
  },
  plugins: [],
}
