import React, { useEffect, useRef } from 'react';

/** Three staggered dots matching Aceternity UI's Loader One. */
export const LoaderOne: React.FC = () => {
  const dots = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animations = dots.current.flatMap((dot, index) => {
      if (!dot || typeof dot.animate !== 'function') return [];

      return [
        dot.animate(
          [
            { transform: 'translateY(0px)' },
            { transform: 'translateY(10px)' },
            { transform: 'translateY(0px)' },
          ],
          {
            duration: 1000,
            iterations: Infinity,
            delay: index * 200,
            easing: 'ease-in-out',
          }
        ),
      ];
    });

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          ref={(dot) => {
            dots.current[index] = dot;
          }}
          className="h-4 w-4 rounded-full border border-neutral-300 bg-gradient-to-b from-neutral-400 to-neutral-300"
        />
      ))}
    </div>
  );
};

export default LoaderOne;
