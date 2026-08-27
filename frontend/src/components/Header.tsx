import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, PlusCircle, Shield, Briefcase, LogOut, Globe, Menu, X, Info } from 'lucide-react';
import { isAuthenticated, isAdmin, isBusinessOwner, getCurrentUser } from '../services/auth';
import { clearStoredTokens } from '../services/api';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl group-hover:scale-105 shadow-sm transition">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-gray-900 tracking-tight">TownPulse</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                Community Directory
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-3">
            <Link
              to="/map"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                isActive('/map') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {t('view_map')}
            </Link>

            <Link
              to="/about"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                isActive('/about') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {t('about')}
            </Link>

            <Link
              to="/submit"
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 px-3.5 py-2 rounded-xl text-sm font-semibold transition"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>{t('submit_listing')}</span>
            </Link>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition"
              title="Toggle Language"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            {/* Auth / Role Links */}
            {auth ? (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                {admin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    title="Admin Panel"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin</span>
                  </Link>
                )}

                {business && (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    title="Business Dashboard"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dashboard</span>
                  </Link>
                )}

                <div className="text-xs text-gray-600 font-medium px-2 py-1 bg-gray-50 rounded-lg border border-gray-200/60">
                  {user?.name || 'User'}
                </div>

                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-lg"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <Link
            to="/map"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-800"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>{t('view_map')}</span>
          </Link>

          <Link
            to="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-semibold text-blue-700"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>{t('submit_listing')}</span>
          </Link>

          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-800"
          >
            <Info className="w-4 h-4 text-gray-500" />
            <span>{t('about')}</span>
          </Link>

          {auth ? (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="text-xs text-gray-500 font-medium">Logged in as {user?.name}</div>
              {admin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-1.5 text-sm font-semibold text-amber-700"
                >
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              {business && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-1.5 text-sm font-semibold text-emerald-700"
                >
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>Business Dashboard</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left py-2 text-sm font-semibold text-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl"
              >
                {t('login')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl shadow-sm"
              >
                {t('register')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
