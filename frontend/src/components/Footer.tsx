import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, ShieldCheck, Github, ExternalLink } from 'lucide-react';
import { Reveal } from './Reveal';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 mt-auto transition-colors duration-200 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <Reveal className="md:col-span-2 space-y-3" direction="up">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-orange-600 to-amber-600 text-white p-2 rounded-xl shadow-xs transition-transform duration-400 ease-fluid hover:scale-110 hover:-rotate-6">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">TownPulse</span>
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-xl transition hover:scale-105 active:scale-95"
              >
                <Github className="w-3.5 h-3.5" />
                <span>{t('footer.openSource')}</span>
                <ExternalLink className="w-3 h-3 text-gray-400 dark:text-slate-400" />
              </a>
            </div>
          </Reveal>

          {/* Quick Links */}
          <Reveal delay={70} direction="up">
            <h4 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-3">
              {t('footer.explore')}
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400 font-medium">
              <li>
                <Link to="/" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/categories" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('nav.categories')}
                </Link>
              </li>
              <li>
                <Link to="/map" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('nav.map')}
                </Link>
              </li>
              <li>
                <Link to="/emergency" className="link-underline inline-block font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200 transition-colors duration-300">
                  {t('nav.emergency')}
                </Link>
              </li>
              <li>
                <Link to="/suggest" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('nav.suggest')}
                </Link>
              </li>
            </ul>
          </Reveal>

          {/* Trust & Help */}
          <Reveal delay={140} direction="up">
            <h4 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-3">
              {t('footer.help')}
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600 dark:text-slate-400 font-medium">
              <li>
                <Link to="/about" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/report" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('nav.report')}
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('accessibility')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="link-underline inline-block hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300">
                  {t('contact')}
                </Link>
              </li>
              <li>
                {/* Was a bare "Verified Civic Data" badge — an unsupported
                    claim with no explanation behind it (AUDIT.md 4.1). The
                    label now links to the procedure it claims. */}
                <Link
                  to="/about#how-we-verify"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {t('about.howWeVerifyHeading')}
                </Link>
              </li>
            </ul>
          </Reveal>
        </div>

        <div className="border-t border-gray-100 dark:border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 dark:text-slate-400 gap-2">
          <p>© {new Date().getFullYear()} {t('app_name')}. {t('footer.rights')}</p>
          <p className="flex items-center gap-1">
            Built for rural and small-town resilience{' '}
            <Heart className="w-3.5 h-3.5 text-red-500 fill-current animate-heartbeat" />
          </p>
        </div>
      </div>
    </footer>
  );
};
