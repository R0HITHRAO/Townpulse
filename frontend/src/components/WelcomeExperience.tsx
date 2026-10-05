import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownRight, ArrowRight, MapPin, Sparkles } from 'lucide-react';

interface WelcomeExperienceProps {
  onEnter: () => void;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ onEnter }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [motionAllowed, setMotionAllowed] = React.useState(
    () =>
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus());

    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(frame);
      if (root) root.inert = wasInert;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setMotionAllowed(!preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);

    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  return createPortal(
    <main className="tp-welcome" aria-labelledby="welcome-heading">
      {motionAllowed && (
        <video
          className="tp-welcome__video"
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          data-testid="welcome-video"
        >
          <source src="/media/townpulse-welcome.mp4" type="video/mp4" />
        </video>
      )}
      <div className="tp-welcome__video-shade" aria-hidden="true" />
      <div className="tp-welcome__grain" aria-hidden="true" />
      <div className="tp-welcome__glow tp-welcome__glow--one" aria-hidden="true" />
      <div className="tp-welcome__glow tp-welcome__glow--two" aria-hidden="true" />

      <header className="tp-welcome__header tp-container">
        <a className="tp-welcome__brand" href="#welcome-heading" aria-label="TownPulse welcome">
          <span className="tp-welcome__brand-mark">
            <MapPin aria-hidden="true" />
          </span>
          <span>
            <strong>TownPulse</strong>
            <small>THE LOCAL LIFE, IN FOCUS</small>
          </span>
        </a>
        <span className="tp-welcome__location">
          <span className="tp-welcome__live-dot" />
          <span className="tp-welcome__location-label">OPEN TO </span>
          <span className="tp-welcome__location-name">EVERYWHERE</span>
        </span>
      </header>

      <div className="tp-welcome__main tp-container">
        <div className="tp-welcome__copy">
          <p className="tp-welcome__eyebrow">
            <Sparkles aria-hidden="true" />
            LOCAL DISCOVERY, WITHOUT BORDERS
          </p>
          <h1
            ref={headingRef}
            id="welcome-heading"
            tabIndex={-1}
            className="text-[clamp(4rem,7.5vw,6.8rem)] max-[900px]:text-[clamp(3.5rem,8vw,5.4rem)] max-[680px]:text-[clamp(3.1rem,14vw,4.8rem)] max-[390px]:text-[clamp(3rem,13vw,3.8rem)] focus:outline-none"
          >
            Find your
            <br />
            <span>people.</span>
            <span className="tp-welcome__anywhere">Anywhere.</span>
          </h1>
          <p className="tp-welcome__description">
            Find the places that make a neighborhood feel alive—wherever the next chapter takes you.
          </p>
          <div className="tp-welcome__credits">
            <span className="tp-welcome__credit-line" />
            <span>A local guide for a world in motion</span>
          </div>
        </div>
      </div>

      <footer className="tp-welcome__footer tp-container">
        <div className="tp-welcome__scroll-cue">
          <ArrowDownRight aria-hidden="true" />
          <span>Stay curious. Get closer.</span>
        </div>
        <button type="button" className="tp-welcome__enter" onClick={onEnter}>
          <span>Get Started</span>
          <span className="tp-welcome__enter-icon">
            <ArrowRight aria-hidden="true" />
          </span>
        </button>
        <span className="tp-welcome__footer-note">YOUR TOWN, OPENED UP</span>
      </footer>
    </main>,
    document.body
  );
};
