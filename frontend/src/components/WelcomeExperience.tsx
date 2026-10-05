import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownRight, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { WorldScene } from './WorldScene';

interface WelcomeExperienceProps {
  onEnter: () => void;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ onEnter }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

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

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    const scene = event.currentTarget.querySelector<HTMLElement>('.tp-welcome__artwork');
    if (!scene) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    scene.style.setProperty('--scene-rotate-x', `${y * -5}deg`);
    scene.style.setProperty('--scene-rotate-y', `${x * 6}deg`);
  };

  const resetPointer = (event: React.PointerEvent<HTMLElement>) => {
    const scene = event.currentTarget.querySelector<HTMLElement>('.tp-welcome__artwork');
    scene?.style.setProperty('--scene-rotate-x', '0deg');
    scene?.style.setProperty('--scene-rotate-y', '0deg');
  };

  return createPortal(
    <main
      className="tp-welcome"
      aria-labelledby="welcome-heading"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
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
            <br />
            Anywhere.
          </h1>
          <p className="tp-welcome__description">
            Find the places that make a neighborhood feel alive—wherever the next chapter takes you.
          </p>
          <div className="tp-welcome__credits">
            <span className="tp-welcome__credit-line" />
            <span>A local guide for a world in motion</span>
          </div>
        </div>

        <div className="tp-welcome__visual">
          <div className="tp-welcome__artwork" aria-hidden="true">
            <div className="tp-welcome__artwork-frame">
              <WorldScene />
            </div>
            <div className="tp-welcome__float-card tp-welcome__float-card--place">
              <span className="tp-welcome__float-icon">
                <MapPin />
              </span>
              <span>
                <small>YOUR NEXT STOP</small>
                <strong>Discover what’s nearby</strong>
              </span>
            </div>
            <div className="tp-welcome__float-card tp-welcome__float-card--signal">
              <span className="tp-welcome__signal-wave" />
              <span>
                <small>LOCAL KNOW-HOW</small>
                <strong>Right around you</strong>
              </span>
            </div>
            <span className="tp-welcome__artwork-index">YOUR WORLD&nbsp; · &nbsp;YOUR WAY</span>
          </div>
        </div>
      </div>

      <footer className="tp-welcome__footer tp-container">
        <div className="tp-welcome__scroll-cue">
          <ArrowDownRight aria-hidden="true" />
          <span>Stay curious. Get closer.</span>
        </div>
        <button type="button" className="tp-welcome__enter" onClick={onEnter}>
          <span>Enter TownPulse</span>
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
