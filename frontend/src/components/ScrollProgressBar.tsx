import React, { useEffect, useState } from 'react';

/**
 * Thin gradient reading-progress bar pinned to the very top of the viewport.
 *
 * Scroll reads are throttled with requestAnimationFrame so the bar stays smooth
 * without firing a state update on every scroll event. Purely decorative, so it
 * is hidden from assistive tech and from print output.
 */
export const ScrollProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const measure = () => {
      frameId = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const next = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      setProgress(Math.min(1, Math.max(0, next)));
    };

    const requestMeasure = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', requestMeasure, { passive: true });
    window.addEventListener('resize', requestMeasure);

    return () => {
      window.removeEventListener('scroll', requestMeasure);
      window.removeEventListener('resize', requestMeasure);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none print:hidden"
      aria-hidden="true"
    >
      <div
        className="h-full w-full origin-left bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(59,130,246,0.65)] transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
};

export default ScrollProgressBar;
