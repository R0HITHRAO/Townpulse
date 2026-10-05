import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  PlusCircle,
  Shield,
  Briefcase,
  LogOut,
  Menu,
  X,
  Info,
  Heart,
  Printer,
} from 'lucide-react';
import { isAuthenticated, isAdmin, isBusinessOwner, getCurrentUser } from '../services/auth';
import { clearStoredTokens, api, Listing, Category } from '../services/api';
import { ThemeToggle } from './ThemeToggle';
import { BookmarksModal } from './BookmarksModal';
import { PrintableDirectoryModal } from './PrintableDirectoryModal';
import { useBookmarks } from '../context/BookmarkContext';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';

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

  const handleOpenPrintable = () => {
    setPrintableOpen(true);
    api
      .getCategories()
      .then(setPrintCategories)
      .catch(async () => setPrintCategories(await loadSnapshotCategories()));
    api
      .searchListings({ per_page: 100 })
      .then((res) => setPrintListings(res.items))
      .catch(async () => {
        const snapshot = await searchSnapshot({ per_page: 100 });
        setPrintListings(snapshot.items);
      });
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
      <header className="sticky top-0 z-40 border-b border-[var(--tp-border)] bg-[var(--tp-bg)]/85 shadow-[var(--tp-shadow-xs)] backdrop-blur-xl transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="rounded-xl bg-[var(--tp-primary)] p-2 text-[var(--tp-on-primary)] shadow-[var(--tp-shadow-xs)] transition-transform group-hover:-rotate-3 group-hover:scale-105">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-[var(--tp-text)]">
                  TownPulse
                </span>
                <span className="ml-2 hidden rounded-full border border-[var(--tp-border)] bg-[var(--tp-surface-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--tp-text-muted)] sm:inline-block">
                  Community Directory
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3">
              <Link
                to="/map"
                aria-current={isActive('/map') ? 'page' : undefined}
                className={`link-underline rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-fluid ${
                  isActive('/map')
                    ? 'bg-[var(--tp-primary-soft)] font-semibold text-[var(--tp-primary-soft-text)]'
                    : 'text-[var(--tp-text-muted)] hover:bg-[var(--tp-surface-2)] hover:text-[var(--tp-primary)]'
                }`}
              >
                {t('view_map')}
              </Link>

              <Link
                to="/about"
                aria-current={isActive('/about') ? 'page' : undefined}
                className={`link-underline rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-fluid ${
                  isActive('/about')
                    ? 'bg-[var(--tp-primary-soft)] font-semibold text-[var(--tp-primary-soft-text)]'
                    : 'text-[var(--tp-text-muted)] hover:bg-[var(--tp-surface-2)] hover:text-[var(--tp-primary)]'
                }`}
              >
                {t('footer.about')}
              </Link>

              {/* Saved Places Bookmark Trigger */}
              <button
                onClick={() => setBookmarksOpen(true)}
                className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--tp-text-muted)] transition-colors hover:bg-[var(--tp-surface-2)] hover:text-[var(--tp-urgent)]"
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
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--tp-text-muted)] transition-colors hover:bg-[var(--tp-surface-2)] hover:text-[var(--tp-accent)]"
                title="Print Emergency Town Directory"
                aria-label="Print Emergency Town Directory"
              >
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Print Guide</span>
              </button>

              <Link to="/submit" className="tp-btn tp-btn-primary rounded-xl">
                <PlusCircle className="h-4 w-4" />
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

                  <div className="rounded-lg border border-[var(--tp-border)] bg-[var(--tp-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--tp-text-muted)]">
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
                    className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-primary)]"
                  >
                    {t('login')}
                  </Link>
                  <Link to="/register" className="tp-btn tp-btn-primary rounded-xl">
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
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform duration-300 ease-fluid active:scale-90"
                aria-label="Toggle Mobile Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-drawer-in stagger-children">
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
              <span>{t('footer.about')}</span>
            </Link>

            {auth ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Logged in as {user?.name}
                </div>
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
      <BookmarksModal isOpen={bookmarksOpen} onClose={() => setBookmarksOpen(false)} />

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
