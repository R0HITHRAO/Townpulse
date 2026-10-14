import React, { useEffect, useRef, useState } from 'react';
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
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const { bookmarks } = useBookmarks();

  // Escape closes the mobile menu — a keyboard user must not be trapped
  // behind an overlay with no way back (AUDIT.md 6.4).
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
  const desktopNavLinkClass = (active: boolean) =>
    `relative rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:origin-left after:rounded-full after:bg-current after:transition-transform after:duration-200 ${
      active
        ? 'text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-950/50 font-semibold after:scale-x-100'
        : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800 after:scale-x-0 hover:after:scale-x-100'
    }`;

  return (
    <>
      <header
        data-tp-header
        className="sticky top-0 z-40 border-b border-[#e7ddce]/80 bg-[#fbf7f0]/90 shadow-[0_4px_20px_rgba(43,33,26,0.035)] backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 motion-reduce:transition-none"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Brand */}
            <Link
              to="/"
              aria-label="TownPulse home"
              className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <div className="rounded-xl bg-gradient-to-tr from-orange-600 to-amber-600 p-2 text-white shadow-sm transition-[transform,box-shadow] duration-200 ease-out group-hover:scale-105 group-hover:-rotate-3 group-hover:shadow-md motion-reduce:transition-none">
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
            <nav className="hidden xl:flex items-center gap-2">
              <Link
                to="/map"
                aria-current={isActive('/map') ? 'page' : undefined}
                className={desktopNavLinkClass(isActive('/map'))}
              >
                {t('view_map')}
              </Link>

              <Link
                to="/categories"
                aria-current={isActive('/categories') ? 'page' : undefined}
                className={desktopNavLinkClass(isActive('/categories'))}
              >
                {t('nav.categories')}
              </Link>

              <Link
                to="/about"
                aria-current={isActive('/about') ? 'page' : undefined}
                className={desktopNavLinkClass(isActive('/about'))}
              >
                {t('nav.about')}
              </Link>

              {/* One tap to emergency numbers from the persistent header on
                  every page (AUDIT.md 2.2) — the highest-stakes task gets the
                  most visible treatment. */}
              <Link
                to="/emergency"
                aria-current={isActive('/emergency') ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
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
            <div className="flex items-center gap-2 xl:hidden">
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
                ref={mobileMenuButtonRef}
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="rounded-xl p-2.5 text-slate-600 transition-[background-color,transform] duration-200 ease-out hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
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
            className="xl:hidden space-y-1 border-t border-slate-200/80 bg-white/95 px-4 pb-5 pt-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl animate-drawer-in stagger-children dark:border-slate-800/80 dark:bg-slate-900/95"
          >
            <Link
              to="/map"
              aria-current={isActive('/map') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isActive('/map')
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                  : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('view_map')}</span>
            </Link>

            <Link
              to="/categories"
              aria-current={isActive('/categories') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isActive('/categories')
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                  : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('nav.categories')}</span>
            </Link>

            <Link
              to="/emergency"
              aria-current={isActive('/emergency') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isActive('/emergency')
                  ? 'bg-rose-600 text-white dark:bg-rose-700'
                  : 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>{t('nav.emergency')}</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setBookmarksOpen(true);
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors duration-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:focus-visible:ring-offset-slate-900"
            >
              <Heart className="w-4 h-4 fill-rose-500" />
              <span>Saved Places ({bookmarks.length})</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenPrintable();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:focus-visible:ring-offset-slate-900"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Print Emergency Directory</span>
            </button>

            <Link
              to="/submit"
              aria-current={isActive('/submit') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isActive('/submit')
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                  : 'text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('submit_listing')}</span>
            </Link>

            <Link
              to="/about"
              aria-current={isActive('/about') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isActive('/about')
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                  : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
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
