/** @type {import('tailwindcss').Config} */
// Sistema "El pasillo de Karen": bloques de color plano, pegatinas con sombra dura
// y notas a mano. Los colores viven en variables CSS (index.css) para que el modo
// oscuro cambie solo; aquí solo se les da nombre.
const v = (name) => `var(--c-${name})`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: v('page'),
        surface: v('surface'),
        // Mora fija: texto sobre limón, naranjilla y guayaba, que no cambia en modo oscuro.
        mora: v('mora'),
        // DEFAULT es el rojo de marca fijo (fondos); text cambia en modo oscuro para tener contraste.
        karen: { DEFAULT: v('karen'), deep: v('karen-deep'), tint: v('karen-tint'), text: v('karen-text') },
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), muted: v('ink-muted'), faint: v('ink-faint') },
        limon: { DEFAULT: v('limon'), deep: v('limon-deep'), tint: v('limon-tint') },
        sticker: { DEFAULT: v('limon'), deep: v('limon-deep'), tint: v('limon-tint') },
        aisle: { DEFAULT: v('page'), rule: v('rule'), strong: v('rule-strong') },
        fresh: { DEFAULT: v('aguacate'), tint: v('aguacate-tint') },
        aguacate: { DEFAULT: v('aguacate'), tint: v('aguacate-tint'), bright: v('aguacate-bright') },
        naranja: { DEFAULT: v('naranja'), tint: v('naranja-tint') },
        guayaba: { DEFAULT: v('guayaba'), tint: v('guayaba-tint') },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Nunito', 'system-ui', 'sans-serif'],
        tag: ['"Bricolage Grotesque"', 'Nunito', 'system-ui', 'sans-serif'],
        hand: ['Caveat', '"Bricolage Grotesque"', 'cursive'],
        stamp: ['Doto', 'monospace'],
      },
      borderRadius: {
        tag: '14px',
        block: '28px',
        photo: '20px',
      },
      boxShadow: {
        pop: '3px 3px 0 0 var(--c-shadow)',
        'pop-sm': '2px 2px 0 0 var(--c-shadow)',
        'pop-lg': '5px 5px 0 0 var(--c-shadow)',
        lift: '0 2px 0 var(--c-shadow), 0 14px 28px -16px var(--c-shadow)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-up': {
          from: { transform: 'scale(.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
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
        // La pegatina cae desde arriba y se pega con rebote, quedando en su rotación final.
        'sticker-slap': {
          '0%': { transform: 'translateY(-60px) scale(1.25) rotate(calc(var(--tilt, 0deg) - 14deg))', opacity: '0' },
          '55%': { transform: 'translateY(0) scale(.94) rotate(var(--tilt, 0deg))', opacity: '1' },
          '75%': { transform: 'translateY(0) scale(1.04) rotate(var(--tilt, 0deg))' },
          '100%': { transform: 'translateY(0) scale(1) rotate(var(--tilt, 0deg))', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '70%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        bump: {
          '0%, 100%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.28) rotate(-8deg)' },
          '70%': { transform: 'scale(.94) rotate(4deg)' },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'tick-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
        stamp: {
          '0%': { transform: 'scale(1.6) rotate(-14deg)', opacity: '0' },
          '60%': { transform: 'scale(.92) rotate(-6deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-6deg)', opacity: '1' },
        },
        // El ticket sale de la impresora: se revela de arriba hacia abajo.
        'print-down': {
          from: { clipPath: 'inset(0 0 100% 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'fly-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 220ms ease-out both',
        'scale-up': 'scale-up 200ms cubic-bezier(.2,.9,.3,1.2) both',
        'drawer-in': 'drawer-in 260ms cubic-bezier(.2,.8,.2,1) both',
        'tag-swing': 'tag-swing 900ms cubic-bezier(.3,1.4,.5,1) both',
        'sticker-slap': 'sticker-slap 620ms cubic-bezier(.3,1.1,.4,1) both',
        pop: 'pop 360ms cubic-bezier(.3,1.5,.5,1) both',
        bump: 'bump 520ms ease-out both',
        wobble: 'wobble 900ms ease-in-out 1',
        marquee: 'marquee 38s linear infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        'tick-pulse': 'tick-pulse 1s ease-in-out infinite',
        stamp: 'stamp 520ms cubic-bezier(.3,1.3,.5,1) both',
        'print-down': 'print-down 900ms steps(18, end) both',
        'typing-dot': 'typing-dot 1.1s ease-in-out infinite',
        'fly-in': 'fly-in 300ms ease-out both',
      },
    },
  },
  plugins: [],
}
