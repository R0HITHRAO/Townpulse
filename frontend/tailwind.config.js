/**
 * TownPulse Tailwind configuration
 * ================================
 *
 * Tailwind is used for *layout* only (grid, flex, spacing, breakpoints).
 * Colour, radius, shadow and font families all resolve to the CSS custom
 * properties in `src/styles/tokens.css`, which means:
 *
 *   - the "Clay & Teak" identity can be retuned without touching a component
 *   - light/dark switching is a single `.dark` class on <html>
 *   - no component can hardcode a hex value and drift from the system
 *
 * The previous config defined a stock Tailwind blue `brand` scale; it is gone.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic aliases -> tokens. Use these instead of raw colours.
        bg: 'var(--tp-bg)',
        surface: {
          DEFAULT: 'var(--tp-surface)',
          2: 'var(--tp-surface-2)',
          3: 'var(--tp-surface-3)',
          inset: 'var(--tp-surface-inset)',
          subtle: 'var(--tp-bg-subtle)',
        },
        edge: {
          DEFAULT: 'var(--tp-border)',
          strong: 'var(--tp-border-strong)',
        },
        ink: {
          DEFAULT: 'var(--tp-text)',
          muted: 'var(--tp-text-muted)',
          subtle: 'var(--tp-text-subtle)',
          inverse: 'var(--tp-text-inverse)',
        },
        brand: {
          DEFAULT: 'var(--tp-primary)',
          hover: 'var(--tp-primary-hover)',
          active: 'var(--tp-primary-active)',
          soft: 'var(--tp-primary-soft)',
          'soft-text': 'var(--tp-primary-soft-text)',
          on: 'var(--tp-on-primary)',
        },
        care: {
          DEFAULT: 'var(--tp-accent)',
          hover: 'var(--tp-accent-hover)',
          soft: 'var(--tp-accent-soft)',
          'soft-text': 'var(--tp-accent-soft-text)',
          on: 'var(--tp-on-accent)',
        },
        warn: {
          DEFAULT: 'var(--tp-warn)',
          soft: 'var(--tp-warn-soft)',
          'soft-text': 'var(--tp-warn-soft-text)',
        },
        urgent: {
          DEFAULT: 'var(--tp-urgent)',
          hover: 'var(--tp-urgent-hover)',
          soft: 'var(--tp-urgent-soft)',
          'soft-text': 'var(--tp-urgent-soft-text)',
        },
        status: {
          verified: 'var(--tp-verified)',
          'verified-soft': 'var(--tp-verified-soft)',
          unverified: 'var(--tp-unverified)',
          'unverified-soft': 'var(--tp-unverified-soft)',
          closed: 'var(--tp-closed)',
          'closed-soft': 'var(--tp-closed-soft)',
          open: 'var(--tp-open)',
          'open-soft': 'var(--tp-open-soft)',
        },
        focus: 'var(--tp-focus-ring)',
      },

      fontFamily: {
        display: 'var(--tp-font-display)',
        sans: 'var(--tp-font-body)',
        body: 'var(--tp-font-body)',
        mono: 'var(--tp-font-mono)',
      },

      fontSize: {
        '2xs': 'var(--tp-text-2xs)',
        xs: 'var(--tp-text-xs)',
        sm: 'var(--tp-text-sm)',
        base: 'var(--tp-text-base)',
        lg: 'var(--tp-text-lg)',
        xl: 'var(--tp-text-xl)',
        '2xl': 'var(--tp-text-2xl)',
        '3xl': 'var(--tp-text-3xl)',
        '4xl': 'var(--tp-text-4xl)',
        '5xl': 'var(--tp-text-5xl)',
      },

      borderRadius: {
        sm: 'var(--tp-radius-sm)',
        DEFAULT: 'var(--tp-radius-md)',
        md: 'var(--tp-radius-md)',
        lg: 'var(--tp-radius-lg)',
        xl: 'var(--tp-radius-xl)',
        '2xl': 'var(--tp-radius-2xl)',
        full: 'var(--tp-radius-full)',
      },

      boxShadow: {
        '2xs': 'var(--tp-shadow-2xs)',
        xs: 'var(--tp-shadow-xs)',
        sm: 'var(--tp-shadow-sm)',
        DEFAULT: 'var(--tp-shadow-sm)',
        md: 'var(--tp-shadow-md)',
        lg: 'var(--tp-shadow-lg)',
        xl: 'var(--tp-shadow-xl)',
        focus: 'var(--tp-shadow-focus)',
      },

      spacing: {
        0.2: 'var(--tp-space-05)',
        1: 'var(--tp-space-1)',
        2: 'var(--tp-space-2)',
        3: 'var(--tp-space-3)',
        4: 'var(--tp-space-4)',
        5: 'var(--tp-space-5)',
        6: 'var(--tp-space-6)',
        7: 'var(--tp-space-7)',
        8: 'var(--tp-space-8)',
        9: 'var(--tp-space-9)',
        // Legacy numeric steps retained so existing layout utilities still work.
        10: '2.5rem',
        11: '3rem',
        12: '3.5rem',
        14: '4rem',
        16: '5rem',
        20: '6rem',
        24: '7rem',
      },

      maxWidth: {
        container: 'var(--tp-container)',
        prose: 'var(--tp-container-prose)',
        touch: 'var(--tp-touch-min)',
      },

      minHeight: {
        touch: 'var(--tp-touch-min)',
        screen: '100dvh',
      },

      minWidth: {
        touch: 'var(--tp-touch-min)',
      },

      transitionTimingFunction: {
        // `ease-fluid` was used ~23 times across the UI before the token layer
        // landed, but only `out`/`standard`/`spring` were ever declared — so the
        // class resolved to nothing and every "fluid" transition silently fell
        // back to the browser default `ease`. Declared here so it resolves.
        fluid: 'var(--tp-ease-out)',
        out: 'var(--tp-ease-out)',
        standard: 'var(--tp-ease-in-out)',
        spring: 'var(--tp-ease-spring)',
      },

      transitionDuration: {
        instant: 'var(--tp-duration-instant)',
        fast: 'var(--tp-duration-fast)',
        DEFAULT: 'var(--tp-duration-base)',
        base: 'var(--tp-duration-base)',
        slow: 'var(--tp-duration-slow)',
        // `duration-400` is used for the larger card/brand hover lifts.
        400: '400ms',
      },

      // `backdrop-blur-xs` — the frosted-glass panels (modal headers, card
      // overlays) ask for a subtler blur than Tailwind's `sm` default.
      backdropBlur: {
        xs: '2px',
      },

      zIndex: {
        base: 'var(--tp-z-base)',
        sticky: 'var(--tp-z-sticky)',
        header: 'var(--tp-z-header)',
        drawer: 'var(--tp-z-drawer)',
        modal: 'var(--tp-z-modal)',
        toast: 'var(--tp-z-toast)',
      },

      keyframes: {
        'tp-rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'tp-fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },

        // ── Entrances ──────────────────────────────────────────────────────────
        // One-shot reveals. The `both` fill mode keeps the element hidden during
        // its delay, so a staggered list does not flash before it animates.
        'tp-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'tp-fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'tp-fade-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'tp-pop-in': {
          '0%': { opacity: '0', transform: 'scale(.88)' },
          '70%': { opacity: '1', transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'tp-scale-in': {
          from: { opacity: '0', transform: 'scale(.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'tp-slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'tp-slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // The sticky header and the emergency banner animate in from above.
        'tp-drawer-in': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'tp-page-in': {
          from: { opacity: '0', transform: 'translateY(6px)', filter: 'blur(3px)' },
          to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },

        // ── Ambient ────────────────────────────────────────────────────────────
        // These loop. Each is switched off for `prefers-reduced-motion` users by
        // the blanket rule in base.css, so none can trap a motion-sensitive user
        // in continuous movement.
        'tp-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'tp-heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.16)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },
        // Softer than Tailwind's `ping`, which expands to 2x. This is a halo.
        'tp-ping-soft': {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '80%, 100%': { transform: 'scale(1.75)', opacity: '0' },
        },
        'tp-dot-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.45' },
          '30%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        'tp-glow-pulse': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.06)' },
        },
        // A light bar sweeping left-to-right across an element.
        'tp-beam': {
          '0%': { transform: 'translateX(-130%)' },
          '100%': { transform: 'translateX(430%)' },
        },
        'tp-aurora': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)' },
          '33%': { transform: 'translate3d(4%, -3%, 0) scale(1.08) rotate(3deg)' },
          '66%': { transform: 'translate3d(-3%, 4%, 0) scale(0.95) rotate(-3deg)' },
        },
        'tp-orb-1': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(6%, 8%, 0) scale(1.12)' },
        },
        'tp-orb-2': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(-7%, 5%, 0) scale(0.95)' },
        },
        'tp-orb-3': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(5%, -6%, 0) scale(1.1)' },
        },
        // Slides a gradient across gradient-clipped text (the 404 numerals).
        'tp-gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },

      animation: {
        rise: 'tp-rise var(--tp-duration-slow) var(--tp-ease-out) both',
        fade: 'tp-fade var(--tp-duration-base) var(--tp-ease-out) both',

        'fade-in': 'tp-fade-in var(--tp-duration-base) var(--tp-ease-out) both',
        'fade-in-up': 'tp-fade-in-up var(--tp-duration-base) var(--tp-ease-out) both',
        'fade-in-right':
          'tp-fade-in-right var(--tp-duration-base) var(--tp-ease-out) both',
        'pop-in': 'tp-pop-in var(--tp-duration-base) var(--tp-ease-spring) both',
        'scale-in': 'tp-scale-in var(--tp-duration-base) var(--tp-ease-out) both',
        'slide-up': 'tp-slide-up var(--tp-duration-base) var(--tp-ease-out) both',
        'slide-down': 'tp-slide-down var(--tp-duration-base) var(--tp-ease-out) both',
        'drawer-in': 'tp-drawer-in var(--tp-duration-base) var(--tp-ease-out) both',
        'page-in': 'tp-page-in var(--tp-duration-slow) var(--tp-ease-out) both',

        float: 'tp-float 5s var(--tp-ease-in-out) infinite',
        heartbeat: 'tp-heartbeat 1.8s var(--tp-ease-in-out) infinite',
        'ping-soft': 'tp-ping-soft 1.6s var(--tp-ease-out) infinite',
        'dot-bounce': 'tp-dot-bounce 1.2s var(--tp-ease-in-out) infinite',
        'glow-pulse': 'tp-glow-pulse 3.4s var(--tp-ease-in-out) infinite',
        beam: 'tp-beam 7s var(--tp-ease-in-out) infinite',
        aurora: 'tp-aurora 26s var(--tp-ease-in-out) infinite',
        'orb-1': 'tp-orb-1 22s var(--tp-ease-in-out) infinite',
        'orb-2': 'tp-orb-2 28s var(--tp-ease-in-out) infinite',
        'orb-3': 'tp-orb-3 34s var(--tp-ease-in-out) infinite',
        'gradient-x': 'tp-gradient-x 6s linear infinite',
      },

      // Stagger scale for `.anim-delay-1` … `.anim-delay-6`, emitted by the
      // plugin below. The hero and its children use it so the page assembles
      // itself instead of appearing all at once.
      animationDelay: {
        1: '80ms',
        2: '160ms',
        3: '240ms',
        4: '320ms',
        5: '400ms',
        6: '480ms',
      },
    },
  },

  plugins: [
    function ({ addUtilities, theme }) {
      const delays = theme('animationDelay') ?? {};
      const utils = {};
      for (const [step, value] of Object.entries(delays)) {
        utils[`.anim-delay-${step}`] = { 'animation-delay': value };
      }
      addUtilities(utils);
    },
  ],
};