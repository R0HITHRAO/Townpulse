import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, PlusCircle, Shield, Briefcase, LogOut, Menu, X, Info, Heart } from 'lucide-react';
import { isAuthenticated, isAdmin, isBusinessOwner, getCurrentUser } from '../services/auth';
import { clearStoredTokens } from '../services/api';
import { ThemeToggle } from './ThemeToggle';
import { BookmarksModal } from './BookmarksModal';
import { useBookmarks } from '../context/BookmarkContext';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const { bookmarks } = useBookmarks();

  const auth = isAuthenticated();
  const admin = isAdmin();
  const business = isBusinessOwner();
  const user = getCurrentUser();

  const handleLogout = () => {
    clearStoredTokens();
    navigate('/');
    window.location.reload();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl group-hover:scale-105 shadow-sm transition">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">TownPulse</span>
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
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t('view_map')}
              </Link>

              <Link
                to="/about"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/about')
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t('about')}
              </Link>

              {/* Saved Places Bookmark Trigger */}
              <button
                onClick={() => setBookmarksOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                title="View Saved Places"
                aria-label="View Saved Places"
              >
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                <span>Saved</span>
                {bookmarks.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              <Link
                to="/submit"
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 px-3.5 py-2 rounded-xl text-sm font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t('submit_listing')}</span>
              </Link>

              {/* Theme Toggle Button */}
              <ThemeToggle />

              {/* Auth / Role Links */}
              {auth ? (
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
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

                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    {user?.name || 'User'}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <Link
                    to="/login"
                    className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition"
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
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setBookmarksOpen(true)}
                className="relative p-2 text-rose-500 rounded-lg"
                title="Saved Places"
                aria-label="Saved Places"
              >
                <Heart className="w-5 h-5 fill-rose-500/20" />
                {bookmarks.length > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              <ThemeToggle />

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle Mobile Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-slide-up">
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('view_map')}</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setBookmarksOpen(true);
              }}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 w-full text-left"
            >
              <Heart className="w-4 h-4 fill-rose-500" />
              <span>Saved Places ({bookmarks.length})</span>
            </button>

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
              className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{t('about')}</span>
            </Link>

            {auth ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Logged in as {user?.name}</div>
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
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl"
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

      {/* Bookmarks Saved Places Modal */}
      <BookmarksModal
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
      />
    </>
  );
};
