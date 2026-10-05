import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, ShieldCheck, Github, ExternalLink } from 'lucide-react';
import { Reveal } from './Reveal';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 mt-auto border-t border-[var(--tp-border)] bg-[var(--tp-surface)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <Reveal className="md:col-span-2 space-y-3" direction="up">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-[var(--tp-primary)] p-2 text-[var(--tp-on-primary)] shadow-[var(--tp-shadow-xs)]">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[var(--tp-text)]">TownPulse</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 max-w-sm leading-relaxed">
              {t('tagline')}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-md">
              {t('footer_text')}
            </p>
            <div className="pt-1">
              <a
                href="https://github.com/R0HITHRAO/Townpulse"
                target="_blank"
                rel="noopener noreferrer"
                className="tp-btn tp-btn-secondary min-h-11 rounded-xl px-3 text-xs"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 text-gray-400 dark:text-slate-400" />
              </a>
            </div>
          </Reveal>

          {/* Quick Links */}
          <Reveal delay={70} direction="up">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--tp-text)]">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm font-medium text-[var(--tp-text-muted)]">
              <li>
                <Link to="/" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  Directory Home
                </Link>
              </li>
              <li>
                <Link to="/map" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  {t('view_map')}
                </Link>
              </li>
              <li>
                <Link to="/submit" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  {t('submit_listing')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </Reveal>

          {/* Trust & Civic */}
          <Reveal delay={140} direction="up">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--tp-text)]">
              Community & Trust
            </h4>
            <ul className="space-y-2.5 text-sm font-medium text-[var(--tp-text-muted)]">
              <li>
                <Link to="/accessibility" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  {t('accessibility')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="inline-block transition-colors hover:text-[var(--tp-primary)]">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tp-border)] bg-[var(--tp-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--tp-accent-soft-text)]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Civic Data
                </span>
              </li>
            </ul>
          </Reveal>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-[var(--tp-border)] pt-6 text-xs text-[var(--tp-text-subtle)] sm:flex-row">
          <p>© {new Date().getFullYear()} TownPulse. Open-source under MIT License.</p>
          <p className="flex items-center gap-1">
            Built for rural and small-town resilience{' '}
            <Heart className="w-3.5 h-3.5 text-red-500 fill-current animate-heartbeat" />
          </p>
        </div>
      </div>
    </footer>
  );
};
