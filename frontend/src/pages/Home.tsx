import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { CategoryChips } from '../components/CategoryChips';
import { ListingCard } from '../components/ListingCard';
import { Map } from '../components/Map';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { PrintableDirectoryModal } from '../components/PrintableDirectoryModal';
import { Pagination } from '../components/Pagination';
import { Reveal } from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';
import { town } from '../config/site';
import { getOpenStatus } from '../utils/businessHours';
import { api, Category, Listing, SearchParams } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';
import { OfflineDataBanner } from '../components/OfflineDataBanner';
import { ShieldCheck, Map as MapIcon, MapPin, PlusCircle, Sparkles, SlidersHorizontal, RefreshCw, Clock, Printer } from 'lucide-react';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [printableOpen, setPrintableOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({ page: 1, per_page: 20 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // True when we fell back to the bundled offline snapshot.
  const [offlineData, setOfflineData] = useState(false);

  useSeo({
    title: t('seo.homeTitle', { town: town.name, region: town.region }),
    description: t('seo.homeDescription', { town: town.name, region: town.region }),
    path: '/',
    ogKey: 'home',
  });

  // Load categories. Previously `.catch(console.error)`, which left the chip
  // row silently empty with no explanation.
  useEffect(() => {
    api
      .getCategories()
      .then(setCategories)
      .catch(async (err: unknown) => {
        console.error(err);
        const snapshotCategories = await loadSnapshotCategories();
        if (snapshotCategories.length > 0) {
          setCategories(snapshotCategories);
        }
      });
  }, []);

  // Fetch listings on filter change
  useEffect(() => {
    setLoading(true);
    const params: SearchParams = {
      ...searchParams,
      category_id: selectedCategory || undefined,
      verified_only: verifiedOnly || undefined,
    };

    api
      .searchListings(params)
      .then((res) => {
        setListings(res.items);
        setTotalCount(res.total);
        setTotalPages(res.total_pages);
        setOfflineData(false);
      })
      // `.catch(console.error)` left `listings` empty and the page rendered
      // "No local services found matching your criteria." — telling the user
      // this town has no services when the truth was that the server was
      // unreachable. Fall back to the bundled real-data snapshot instead.
      .catch(async (err: unknown) => {
        console.error(err);
        const snapshot = await searchSnapshot(params);
        setListings(snapshot.items);
        setTotalCount(snapshot.total);
        setTotalPages(snapshot.total_pages);
        setOfflineData(true);
      })
      .finally(() => setLoading(false));
  }, [searchParams, selectedCategory, verifiedOnly]);

  // Client-side "open now" filtering. Unknown hours (no data, or strings that
  // cannot be read) are deliberately excluded — an unknown listing is not an
  // open one, and this filter is how people decide where to walk (AUDIT.md 4.4).
  const displayedListings = useMemo(() => {
    if (!openOnly) return listings;
    return listings.filter((l) => getOpenStatus(l.hours).state === 'open');
  }, [listings, openOnly]);

  const handleHeroSearch = (filters: {
    q: string;
    radius?: number;
    lat?: number;
    lng?: number;
    openOnly?: boolean;
  }) => {
    if (filters.openOnly !== undefined) {
      setOpenOnly(filters.openOnly);
    }
    setSearchParams((prev) => ({
      ...prev,
      q: filters.q,
      radius: filters.radius,
      lat: filters.lat,
      lng: filters.lng,
      sort_by: filters.lat ? 'distance' : 'created_at',
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setVerifiedOnly(false);
    setOpenOnly(false);
    setSearchParams({ page: 1, per_page: 20 });
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative transition-colors duration-200">
      {/* Live Animated Background with Floating Particles & Ambient Glow */}
      <AnimatedBackground />

      {/* Hero Section */}
      <section className="tp-home-hero relative overflow-hidden px-4 pb-20 pt-14 transition-colors duration-200 sm:px-6 lg:px-8">
        <div className="tp-hero-inner relative z-10 mx-auto max-w-7xl">
          <div className="tp-hero-copy animate-rise anim-delay-1">
          <div className="relative inline-flex mb-5">
            {/* Soft pulsing halo behind the badge */}
            <span
              className="absolute inset-0 rounded-full bg-orange-400/30 dark:bg-orange-500/25 blur-xl animate-glow-pulse"
              aria-hidden="true"
            />
            <div className="tp-hero-eyebrow relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Local knowledge, close at hand</span>
            </div>
          </div>

          <h1 className="tp-hero-title mb-4 animate-rise anim-delay-2">
            Find what you need<br className="hidden sm:inline" /> <em>right around you.</em>
          </h1>

          <p className="tp-hero-description mb-8 max-w-xl animate-rise anim-delay-3">
            {t('tagline')}
          </p>
          </div>
          <div className="tp-hero-search animate-rise anim-delay-4">
            <div className="tp-search-caption"><MapPin className="h-4 w-4" /> Explore services in {town.name}</div>
            <SearchBar onSearch={handleHeroSearch} initialOpenOnly={openOnly} />
            <div className="tp-hero-footnote"><ShieldCheck className="h-4 w-4" /> Community sourced. Locally relevant.</div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="tp-home-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 -mt-8 flex-1 w-full space-y-6 relative z-10">
        {/* Refined Filter & Category Bar */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors duration-200 animate-fade-in-up anim-delay-5">
          {/* Top Row: Full width Category Slider */}
          <div className="w-full">
            <CategoryChips
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Bottom Toolbar: Quick Action Filters & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Active Filters Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Filters:</span>
              </span>

              {selectedCategoryObj && (
                <span className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-lg font-medium border border-orange-200 dark:border-orange-800">
                  <span>{selectedCategoryObj.icon}</span>
                  <span>{selectedCategoryObj.name}</span>
                </span>
              )}

              {verifiedOnly && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-medium border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Verified Only</span>
                </span>
              )}

              {openOnly && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-medium border border-emerald-300 dark:border-emerald-800">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Open Now</span>
                </span>
              )}

              {(selectedCategory !== null || verifiedOnly || openOnly || searchParams.q) && (
                <button
                  onClick={handleResetFilters}
                  className="text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium inline-flex items-center gap-1 ml-1 hover:underline transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Right: Quick Action Toggles */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setOpenOnly(!openOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border hover:scale-105 active:scale-95 ${
                  openOnly
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${openOnly ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>{t('home.openNow', { defaultValue: 'Open now' })}</span>
              </button>

              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border hover:scale-105 active:scale-95 ${
                  verifiedOnly
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${verifiedOnly ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>{t('verified_only')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintableOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95 shadow-2xs"
                title="Print Emergency Services Directory"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Pocket Guide</span>
              </button>

              <Link
                to="/map"
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95"
              >
                <MapIcon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>Map View</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Listings Grid + Preview Map */}
        <div id="directory-results" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-24">
          {/* Listings List (2 Cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {offlineData && (
              <OfflineDataBanner
                onRetry={() => setSearchParams((prev) => ({ ...prev }))}
              />
            )}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Local Services</span>
                <span
                  key={totalCount}
                  className="text-xs bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 rounded-full font-bold animate-pop-in"
                >
                  {totalCount} Found
                </span>
              </h2>
            </div>

            {loading ? (
              <LoadingSpinner message="Searching verified local services..." />
            ) : displayedListings.length === 0 ? (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center animate-scale-in">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  No local services found matching your criteria.
                </p>
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition hover:scale-105 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  Submit a Service in this Area
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedListings.map((listing, index) => (
                  <Reveal
                    key={listing.id}
                    direction="up"
                    delay={Math.min(index, 7) * 55}
                    className="h-full"
                  >
                    <ListingCard listing={listing} />
                  </Reveal>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && (
              <Pagination
                page={searchParams.page ?? 1}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setSearchParams((prev) => ({ ...prev, page: p }));
                  document
                    .getElementById('directory-results')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="pt-2"
              />
            )}
          </div>

          {/* Map Preview Sticky Sidebar (1 Col) - Compact & Elegant */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-3 animate-fade-in-right anim-delay-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Location Overview
                </h3>
                <Link to="/map" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  Full Screen Map →
                </Link>
              </div>
              <Map listings={displayedListings} className="h-[220px] shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" />
            </div>
          </div>
        </div>
      </main>

      {/* Printable Emergency Directory Modal */}
      {printableOpen && (
        <PrintableDirectoryModal
          listings={listings}
          categories={categories}
          onClose={() => setPrintableOpen(false)}
        />
      )}
    </div>
  );
};
