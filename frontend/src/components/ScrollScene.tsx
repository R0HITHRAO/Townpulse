import React, { useEffect, useRef } from 'react';

interface ScrollSceneProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article';
}

export const ScrollScene: React.FC<ScrollSceneProps> = ({
  children,
  as: Tag = 'div',
  className = '',
  ...rest
}) => {
  const sceneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = sceneRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    let active = false;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (!active) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress = Math.min(
        1,
        Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height))
      );
      const curve = Math.sin(progress * Math.PI);
      element.style.setProperty('--tp-scroll-progress', progress.toFixed(4));
      element.style.setProperty('--tp-scroll-depth', `${((0.5 - progress) * 56).toFixed(2)}px`);
      element.style.setProperty('--tp-scroll-tilt', `${((0.5 - progress) * 8).toFixed(2)}deg`);
      element.style.setProperty('--tp-scroll-scale', (0.97 + curve * 0.035).toFixed(4));
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              active = entry.isIntersecting;
              if (active) scheduleUpdate();
            },
            { rootMargin: '120px 0px' }
          );

    if (observer) observer.observe(element);
    else {
      active = true;
      scheduleUpdate();
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Tag
      ref={sceneRef as React.Ref<never>}
      className={`tp-scroll-scene ${className}`.trim()}
      {...rest}
    >
      <div className="tp-scroll-scene__object">{children}</div>
    </Tag>
  );
};
