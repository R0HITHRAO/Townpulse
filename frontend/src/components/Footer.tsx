import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, ShieldCheck, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-xs">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-gray-900 tracking-tight">TownPulse</span>
            </div>
            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
              {t('tagline')}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-md">
              {t('footer_text')}
            </p>
            <div className="pt-1">
              <a
                href="https://github.com/R0HITHRAO/Townpulse"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl transition"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 font-medium">
              <li>
                <Link to="/" className="hover:text-blue-600 transition">Directory Home</Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-blue-600 transition">{t('view_map')}</Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-blue-600 transition">{t('submit_listing')}</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-600 transition">{t('about')}</Link>
              </li>
            </ul>
          </div>

          {/* Trust & Civic */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Community & Trust
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600 font-medium">
              <li>
                <Link to="/accessibility" className="hover:text-blue-600 transition">{t('accessibility')}</Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Civic Data
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <p>© {new Date().getFullYear()} TownPulse. Open-source under MIT License.</p>
          <p className="flex items-center gap-1">
            Built for rural and small-town resilience <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
          </p>
        </div>
      </div>
    </footer>
  );
};
