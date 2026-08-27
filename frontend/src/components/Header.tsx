import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, PlusCircle, User as UserIcon, Shield, Briefcase, LogOut, Globe } from 'lucide-react';
import { isAuthenticated, isAdmin, isBusinessOwner, getCurrentUser } from '../services/auth';
import { clearStoredTokens } from '../services/api';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = isAuthenticated();
  const admin = isAdmin();
  const business = isBusinessOwner();
  const user = getCurrentUser();

  const handleLogout = () => {
    clearStoredTokens();
    navigate('/');
    window.location.reload();
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('townpulse_lang', nextLang);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 text-white p-2 rounded-xl group-hover:bg-blue-700 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">TownPulse</span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                Small Towns
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/map"
              className="text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition"
            >
              {t('view_map')}
            </Link>

            <Link
              to="/submit"
              className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3.5 py-2 rounded-lg text-sm font-medium transition"
            >
              <PlusCircle className="w-4 h-4" />
              {t('submit_listing')}
            </Link>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md transition"
              title="Toggle Language"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              {i18n.language === 'en' ? 'हिन्दी' : 'EN'}
            </button>

            {/* Auth / Role Links */}
            {auth ? (
              <div className="flex items-center gap-2">
                {admin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 bg-amber-50 text-amber-800 hover:bg-amber-100 px-2.5 py-1.5 rounded-md text-xs font-semibold transition"
                    title="Admin Panel"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                {business && (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md text-xs font-semibold transition"
                    title="Business Dashboard"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 p-2 rounded-md transition"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
