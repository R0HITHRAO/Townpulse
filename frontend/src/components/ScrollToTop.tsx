import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLenis } from './SmoothScroll';

/**
 * Scrolls to the top of the window whenever the route pathname changes,
 * restoring expected navigation behavior in a single-page app.
 *
 * While Lenis is active it owns the scroll position, so the jump goes through
 * it (`immediate` skips the smoothing animation); otherwise this falls back to
 * a plain `window.scrollTo`.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
