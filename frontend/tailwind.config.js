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
        xs: 'var(--tp-shadow-xs)',
        sm: 'var(--tp-shadow-sm)',
        DEFAULT: 'var(--tp-shadow-sm)',
        md: 'var(--tp-shadow-md)',
        lg: 'var(--tp-shadow-lg)',
        xl: 'var(--tp-shadow-xl)',
        focus: 'var(--tp-shadow-focus)',
      },

      spacing: {
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
      },

      animation: {
        rise: 'tp-rise var(--tp-duration-slow) var(--tp-ease-out) both',
        fade: 'tp-fade var(--tp-duration-base) var(--tp-ease-out) both',
      },
    },
  },
  plugins: [],
};