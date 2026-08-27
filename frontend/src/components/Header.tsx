import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, PlusCircle, Shield, Briefcase, LogOut, Globe, Menu, X, Info } from 'lucide-react';
import { isAuthenticated, isAdmin, isBusinessOwner, getCurrentUser } from '../services/auth';
import { clearStoredTokens } from '../services/api';
import { ThemeToggle } from './ThemeToggle';

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
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl group-hover:scale-105 shadow-sm transition">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">TownPulse</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-700/50">
                Community Directory
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-3">
            <Link
              to="/map"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                isActive('/map')
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 font-semibold'
                  : 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('view_map')}
            </Link>

            <Link
              to="/about"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                isActive('/about')
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 font-semibold'
                  : 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('about')}
            </Link>

            <Link
              to="/submit"
              className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 px-3.5 py-2 rounded-xl text-sm font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('submit_listing')}</span>
            </Link>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 px-2.5 py-2 rounded-xl transition"
              title="Toggle Language"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Auth / Role Links */}
            {auth ? (
              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-800 pl-3">
                {admin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-700/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    title="Admin Panel"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Admin</span>
                  </Link>
                )}

                {business && (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-700/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    title="Business Dashboard"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Dashboard</span>
                  </Link>
                )}

                <div className="text-xs text-gray-600 dark:text-slate-300 font-medium px-2.5 py-1 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200/60 dark:border-slate-700/60">
                  {user?.name || 'User'}
                </div>

                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-800 pl-3">
                <Link
                  to="/login"
                  className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm transition hover:scale-105 active:scale-95"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Navigation controls */}
          <div className="flex items-center gap-1.5 md:hidden">
            <ThemeToggle />

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 px-2 py-1.5 rounded-lg"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-slide-up">
          <Link
            to="/map"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-800 dark:text-slate-200"
          >
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('view_map')}</span>
          </Link>

          <Link
            to="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-semibold text-blue-700 dark:text-blue-400"
          >
            <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('submit_listing')}</span>
          </Link>

          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-800 dark:text-slate-200"
          >
            <Info className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span>{t('about')}</span>
          </Link>

          {auth ? (
            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
              <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Logged in as {user?.name}</div>
              {admin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400"
                >
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              {business && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Business Dashboard</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left py-2 text-sm font-semibold text-red-600 dark:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                {t('login')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
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
