import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { CategoryChips } from '../components/CategoryChips';
import { ListingCard } from '../components/ListingCard';
import { Map } from '../components/Map';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { getOpenStatus } from '../utils/businessHours';
import { api, Category, Listing, SearchParams } from '../services/api';
import { ShieldCheck, Map as MapIcon, PlusCircle, Sparkles, SlidersHorizontal, RefreshCw, Clock } from 'lucide-react';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({ page: 1, per_page: 20 });
  const [totalCount, setTotalCount] = useState(0);

  // Load categories
  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams, selectedCategory, verifiedOnly]);

  // Client-side Open Now filtering
  const displayedListings = useMemo(() => {
    if (!openOnly) return listings;
    return listings.filter((l) => getOpenStatus(l.hours).isOpen);
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
      <section className="bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-slate-50 dark:from-slate-900/90 dark:via-blue-950/80 dark:to-slate-950 text-slate-900 dark:text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200 z-10">
        <div className="max-w-5xl mx-auto text-center relative z-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-blue-100/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-blue-800 dark:text-blue-200 mb-5 border border-blue-200 dark:border-white/10 shadow-xs animate-float">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-yellow-300 animate-pulse" />
            <span>Community-First Local Directory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight text-slate-900 dark:text-white">
            Find Essential Services in <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-300 dark:via-blue-100 dark:to-indigo-300">
              Your Local Community
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-blue-200/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('tagline')}
          </p>

          {/* Hero Search Bar */}
          <SearchBar onSearch={handleHeroSearch} initialOpenOnly={openOnly} />
        </div>
      </section>

      {/* Main Content Area */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4 flex-1 w-full space-y-6 relative z-10">
        {/* Refined Filter & Category Bar */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors duration-200">
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
                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg font-medium border border-blue-200 dark:border-blue-800">
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
                <span>Open Now</span>
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

              <Link
                to="/map"
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95"
              >
                <MapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Map View</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Listings Grid + Preview Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Listings List (2 Cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Local Services</span>
                <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                  {displayedListings.length} Found
                </span>
              </h2>
            </div>

            {loading ? (
              <LoadingSpinner message="Searching verified local services..." />
            ) : displayedListings.length === 0 ? (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  No local services found matching your criteria.
                </p>
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition hover:scale-105 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  Submit a Service in this Area
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>

          {/* Map Preview Sticky Sidebar (1 Col) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Location Overview
                </h3>
                <Link to="/map" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  Full Screen Map →
                </Link>
              </div>
              <Map listings={displayedListings} className="h-[420px] shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
