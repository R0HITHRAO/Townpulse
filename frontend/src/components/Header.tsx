import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, PlusCircle, Shield, Briefcase, LogOut, Menu, X, Info, Heart, Printer, Phone, FolderOpen } from 'lucide-react';
import { isAuthenticated, isAdmin, isBusinessOwner, getCurrentUser } from '../services/auth';
import { clearStoredTokens, api, Listing, Category } from '../services/api';
import { ThemeToggle } from './ThemeToggle';
import { BookmarksModal } from './BookmarksModal';
import { PrintableDirectoryModal } from './PrintableDirectoryModal';
import { useBookmarks } from '../context/BookmarkContext';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [printableOpen, setPrintableOpen] = useState(false);
  const [printListings, setPrintListings] = useState<Listing[]>([]);
  const [printCategories, setPrintCategories] = useState<Category[]>([]);
  const { bookmarks } = useBookmarks();

  // Escape closes the mobile menu — a keyboard user must not be trapped
  // behind an overlay with no way back (AUDIT.md 6.4).
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const handleOpenPrintable = () => {
    api.getCategories().then(setPrintCategories).catch(console.error);
    api.searchListings({ per_page: 100 }).then(res => setPrintListings(res.items)).catch(console.error);
    setPrintableOpen(true);
  };

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
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200 animate-slide-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-gradient-to-tr from-orange-600 to-amber-600 text-white p-2 rounded-xl shadow-sm transition-all duration-400 ease-fluid group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">TownPulse</span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-700/50">
                  Community Directory
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3">
              <Link
                to="/map"
                aria-current={isActive('/map') ? 'page' : undefined}
                className={`link-underline px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-fluid ${
                  isActive('/map')
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-950/50 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t('view_map')}
              </Link>

              <Link
                to="/categories"
                aria-current={isActive('/categories') ? 'page' : undefined}
                className={`link-underline px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-fluid ${
                  isActive('/categories')
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-950/50 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t('nav.categories')}
              </Link>

              <Link
                to="/about"
                aria-current={isActive('/about') ? 'page' : undefined}
                className={`link-underline px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-fluid ${
                  isActive('/about')
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-950/50 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t('nav.about')}
              </Link>

              {/* One tap to emergency numbers from the persistent header on
                  every page (AUDIT.md 2.2) — the highest-stakes task gets the
                  most visible treatment. */}
              <Link
                to="/emergency"
                aria-current={isActive('/emergency') ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ease-fluid ${
                  isActive('/emergency')
                    ? 'text-white bg-rose-600 shadow-sm'
                    : 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                {t('nav.emergency')}
              </Link>

              {/* Saved Places Bookmark Trigger */}
              <button
                onClick={() => setBookmarksOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all duration-300 ease-fluid"
                title="View Saved Places"
                aria-label="View Saved Places"
              >
                <Heart
                  className={`w-4 h-4 text-rose-500 ${
                    bookmarks.length > 0 ? 'fill-rose-500/30 animate-heartbeat' : 'fill-rose-500/20'
                  }`}
                />
                <span>Saved</span>
                {bookmarks.length > 0 && (
                  <span
                    key={bookmarks.length}
                    className="inline-block bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pop-in"
                  >
                    {bookmarks.length}
                  </span>
                )}
              </button>

              {/* Printable Emergency Directory Trigger */}
              <button
                onClick={handleOpenPrintable}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all duration-300 ease-fluid"
                title="Print Emergency Town Directory"
                aria-label="Print Emergency Town Directory"
              >
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Print Guide</span>
              </button>

              <Link
                to="/submit"
                className="group/submit flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200/60 dark:border-orange-800/60 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-fluid hover:scale-[1.03] active:scale-[0.97] shine-sweep"
              >
                <PlusCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 transition-transform duration-300 ease-fluid group-hover/submit:rotate-90" />
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
                    className="text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 px-3 py-2 text-sm font-medium transition"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    to="/register"
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm transition hover:scale-105 active:scale-95"
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
                className="relative p-2 text-rose-500 rounded-lg transition-transform duration-300 ease-fluid hover:scale-110 active:scale-95"
                title="Saved Places"
                aria-label="Saved Places"
              >
                <Heart className="w-5 h-5 fill-rose-500/20" />
                {bookmarks.length > 0 && (
                  <span
                    key={bookmarks.length}
                    className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full animate-pop-in"
                  >
                    {bookmarks.length}
                  </span>
                )}
              </button>

              <ThemeToggle />

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform duration-300 ease-fluid active:scale-90"
                aria-label="Toggle Mobile Menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-drawer-in stagger-children"
          >
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('view_map')}</span>
            </Link>

            <Link
              to="/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <FolderOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('nav.categories')}</span>
            </Link>

            <Link
              to="/emergency"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-3 text-sm font-bold text-rose-700 dark:text-rose-300"
            >
              <Phone className="w-4 h-4" />
              <span>{t('nav.emergency')}</span>
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

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenPrintable();
              }}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 w-full text-left"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Print Emergency Directory</span>
            </button>

            <Link
              to="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-orange-700 dark:text-orange-400"
            >
              <PlusCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('submit_listing')}</span>
            </Link>

            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{t('nav.about')}</span>
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
                  className="text-center py-2 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm"
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

      {/* Printable Emergency Directory Modal */}
      {printableOpen && (
        <PrintableDirectoryModal
          listings={printListings}
          categories={printCategories}
          onClose={() => setPrintableOpen(false)}
        />
      )}
    </>
  );
};
