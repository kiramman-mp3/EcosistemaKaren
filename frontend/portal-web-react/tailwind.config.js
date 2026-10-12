/** @type {import('tailwindcss').Config} */
// Sistema "Fleje": la etiqueta de precio de percha del supermercado.
// Rojo Karen para ofertas y urgencia, tinta azul para texto, amarillo de
// etiqueta de precio rebajado, gris de pasillo para fondos.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        karen: {
          DEFAULT: '#D52B1E',
          deep: '#A81E14',
          tint: '#FBE9E7',
        },
        ink: {
          DEFAULT: '#13284B',
          soft: '#3B4A66',
          muted: '#5E6B82',
          faint: '#8C96A8',
        },
        sticker: {
          DEFAULT: '#FFD400',
          deep: '#E0B800',
          tint: '#FFF6C7',
        },
        aisle: {
          DEFAULT: '#EFF1F4',
          rule: '#D9DDE3',
          strong: '#C5CBD4',
        },
        fresh: {
          DEFAULT: '#12805C',
          tint: '#E3F3EC',
        },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        tag: ['"Archivo Narrow"', 'Archivo', 'sans-serif'],
        stamp: ['Doto', '"Archivo Narrow"', 'monospace'],
      },
      borderRadius: {
        tag: '6px',
      },
      boxShadow: {
        lift: '0 1px 0 rgba(19, 40, 75, 0.08), 0 8px 24px -12px rgba(19, 40, 75, 0.35)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'tag-swing': {
          '0%': { transform: 'rotate(-4deg)' },
          '60%': { transform: 'rotate(1.5deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 220ms ease-out both',
        'drawer-in': 'drawer-in 260ms cubic-bezier(.2,.8,.2,1) both',
        'tag-swing': 'tag-swing 900ms cubic-bezier(.3,1.4,.5,1) both',
      },
    },
  },
  plugins: [],
}
