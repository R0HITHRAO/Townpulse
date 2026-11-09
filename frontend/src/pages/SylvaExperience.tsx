import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { SylvaHero } from '../components/SylvaHero';
import '../styles/sylva-experience.css';

export const SylvaExperience: React.FC = () => {
  useEffect(() => {
    document.documentElement.classList.add('tp-sylva-active');
    document.body.classList.add('tp-sylva-active');
    return () => {
      document.documentElement.classList.remove('tp-sylva-active');
      document.body.classList.remove('tp-sylva-active');
    };
  }, []);

  return (
    <main className="sylva-experience" aria-label="Sylva immersive experience">
      <SylvaHero />
      <Link to="/" className="sylva-experience__back">
        <ArrowLeft aria-hidden="true" />
        <MapPin aria-hidden="true" />
        <span>TownPulse</span>
      </Link>
    </main>
  );
};

export default SylvaExperience;
