import React, { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

interface SmoothScrollProps {
  children: React.ReactNode;
}

/**
 * The Lenis instance currently driving the page, if any.
 *
 * Programmatic scrolling (e.g. `ScrollToTop` after a route change) must go
 * through Lenis while it is active — a raw `window.scrollTo` gets overwritten
 * by Lenis's next animation frame and the viewport jumps back. Consumers fall
 * back to `window.scrollTo` when this returns null (reduced-motion users, or
 * before the effect has run).
 */
let lenisInstance: Lenis | null = null;

export const getLenis = (): Lenis | null => lenisInstance;

export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children }) => {
  useEffect(() => {
    // Smoothing scroll is a preference, not a requirement: users who ask the
    // OS for reduced motion get native scrolling untouched.
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisInstance = lenis;

    // The loop must be cancellable: without this, unmounting leaves a
    // requestAnimationFrame chain driving a destroyed instance forever
    // (and twice over under React 18 StrictMode).
    let frameId = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      if (lenisInstance === lenis) lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
};
