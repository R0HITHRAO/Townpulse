import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { CategoryChips } from '../components/CategoryChips';
import { ListingCard } from '../components/ListingCard';
import { Map } from '../components/Map';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api, Category, Listing, SearchParams } from '../services/api';
import { ShieldCheck, Map as MapIcon, PlusCircle, Sparkles, Filter } from 'lucide-react';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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

  const handleHeroSearch = (filters: { q: string; radius?: number; lat?: number; lng?: number }) => {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-900 text-white pt-14 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-blue-100 mb-6 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Community-First Local Directory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Find Essential Services in <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200">
              Your Local Community
            </span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('tagline')}
          </p>

          {/* Hero Search Bar */}
          <SearchBar onSearch={handleHeroSearch} />
        </div>
      </section>

      {/* Main Content Area */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-8 flex-1 w-full">
        {/* Categories Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full overflow-hidden">
            <CategoryChips
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Verified Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0">
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                verifiedOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${verifiedOnly ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span>{t('verified_only')}</span>
            </button>

            <Link
              to="/map"
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map View</span>
            </Link>
          </div>
        </div>

        {/* Listings Grid + Preview Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Listings List (2 Cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Local Services</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                  {totalCount}
                </span>
              </h2>
            </div>

            {loading ? (
              <LoadingSpinner message="Searching verified local services..." />
            ) : listings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm mb-4">
                  No local services found matching your criteria.
                </p>
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  Submit a Service in this Area
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>

          {/* Map Preview Sticky Sidebar (1 Col) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Location Overview
                </h3>
                <Link to="/map" className="text-xs font-semibold text-blue-600 hover:underline">
                  Full Screen Map →
                </Link>
              </div>
              <Map listings={listings} className="h-[420px] shadow-sm" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
