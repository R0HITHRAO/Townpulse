/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      /* Fluid, natural-feeling motion curves shared across the app */
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        400: '400ms',
        600: '600ms',
        800: '800ms',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },

        /* ── Fluid entrances (fill-mode: both so stagger delays never flash) ── */
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drawerIn: {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(26px) scale(0.98)', filter: 'blur(8px)' },
          '60%': { opacity: '1', filter: 'blur(0px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.72)' },
          '60%': { opacity: '1', transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(14px)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0px)' },
        },

        /* ── Ambient / continuous motion ── */
        gradientPan: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        auroraDrift: {
          '0%, 100%': { transform: 'translate3d(-4%, 0, 0) rotate(0deg) scale(1)' },
          '50%': { transform: 'translate3d(6%, -4%, 0) rotate(180deg) scale(1.18)' },
        },
        beamSweep: {
          '0%': { transform: 'translate3d(-30%, 0, 0) rotate(8deg)', opacity: '0' },
          '35%': { opacity: '0.5' },
          '100%': { transform: 'translate3d(130%, 0, 0) rotate(8deg)', opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': {
            opacity: '0.35',
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.35)',
          },
          '50%': {
            opacity: '0.75',
            transform: 'scale(1.03)',
            boxShadow: '0 0 24px 6px rgba(59, 130, 246, 0.18)',
          },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
        pingSoft: {
          '0%': { transform: 'scale(0.9)', opacity: '0.55' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        dotBounce: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        shineSweep: {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)' },
        },

        /* ── Micro-interactions ── */
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(8deg)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '12%': { transform: 'scale(1.22)' },
          '24%': { transform: 'scale(1)' },
          '36%': { transform: 'scale(1.16)' },
          '60%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 4s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 6s ease-in-out infinite',

        /* Fluid entrances — `backwards` fill keeps the from-state during stagger
           delays without permanently overriding hover transforms afterwards */
        'fade-in-up': 'fadeInUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'fade-in-left': 'fadeInLeft 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'fade-in-right': 'fadeInRight 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'slide-down': 'slideDown 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'drawer-in': 'drawerIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'rise': 'riseIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'pop-in': 'popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
        'page-in': 'pageIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards',

        /* Ambient / continuous */
        'gradient-x': 'gradientPan 8s ease-in-out infinite',
        'aurora': 'auroraDrift 26s ease-in-out infinite',
        'beam': 'beamSweep 16s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3.2s ease-in-out infinite',
        'spin-slow': 'spinSlow 2.4s linear infinite',
        'ping-soft': 'pingSoft 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
        'dot-bounce': 'dotBounce 1s ease-in-out infinite',
        'shine': 'shineSweep 1s cubic-bezier(0.22, 1, 0.36, 1)',

        /* Micro-interactions */
        'wiggle': 'wiggle 0.6s ease-in-out',
        'heartbeat': 'heartbeat 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
