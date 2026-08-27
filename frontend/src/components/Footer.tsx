import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-gray-900">TownPulse</span>
            </div>
            <p className="text-sm text-gray-600 max-w-sm mb-4">
              {t('tagline')}
            </p>
            <p className="text-xs text-gray-500">
              {t('footer_text')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/" className="hover:text-blue-600 transition">Home</Link>
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
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Community & Trust
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/accessibility" className="hover:text-blue-600 transition">{t('accessibility')}</Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Local Data
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} TownPulse Project. Open-source under MIT License.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Built for rural and small-town resilience <Heart className="w-3 h-3 text-red-500 fill-current" />
          </p>
        </div>
      </div>
    </footer>
  );
};
