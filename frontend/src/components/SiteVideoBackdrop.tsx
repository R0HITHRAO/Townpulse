import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const SiteVideoBackdrop: React.FC = () => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [motionAllowed, setMotionAllowed] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setMotionAllowed(!preference.matches);
    preference.addEventListener('change', updatePreference);

    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop || !motionAllowed) return;

    let frame = 0;
    const updateScrollProgress = () => {
      frame = 0;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
      backdrop.style.setProperty('--tp-site-scroll-offset', `${(-progress * 32).toFixed(2)}px`);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [motionAllowed]);

  return (
    <div ref={backdropRef} className="tp-site-backdrop" aria-hidden="true">
      {motionAllowed && (
        <video
          className="tp-site-backdrop__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          data-testid="site-background-video"
        >
          <source src="/media/townpulse-welcome.mp4" type="video/mp4" />
        </video>
      )}
      <div className="tp-site-backdrop__shade" />
    </div>
  );
};
