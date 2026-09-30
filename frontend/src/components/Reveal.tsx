import React, { useEffect, useRef, useState } from 'react';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur' | 'fade';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Direction the content travels from while fading in. */
  direction?: RevealDirection;
  /** Stagger delay in milliseconds (used for lists and grids). */
  delay?: number;
  /** How much of the element must be visible before revealing (0–1). */
  threshold?: number;
  /** Keep the element revealed after the first intersection. */
  once?: boolean;
  /** Element to render as the wrapper. */
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

const DIRECTION_CLASS: Record<RevealDirection, string> = {
  up: 'reveal-up',
  down: 'reveal-down',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
  blur: 'reveal-blur',
  fade: 'reveal-fade',
};

/**
 * Lightweight scroll-reveal wrapper built on IntersectionObserver + CSS transitions.
 *
 * Degrades gracefully: when IntersectionObserver is unavailable (older browsers,
 * jsdom during tests) or when the user prefers reduced motion, the content is
 * shown immediately instead of animating.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.15,
  once = true,
  as: Tag = 'div',
  className = '',
  style,
  ...rest
}) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <Tag
      // The dynamic tag keeps the ref typing simple; the element is always an HTMLElement.
      ref={elementRef as React.Ref<never>}
      className={`reveal ${DIRECTION_CLASS[direction]} ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
