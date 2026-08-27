import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Map } from '../components/Map';
import { ListingCard } from '../components/ListingCard';
import { CategoryChips } from '../components/CategoryChips';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api, Category, Listing } from '../services/api';
import { getOpenStatus } from '../utils/businessHours';
import {
  Search,
  SlidersHorizontal,
  Map as MapIcon,
  List,
  Columns,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';

type LayoutMode = 'split' | 'map' | 'list';

export const MapView: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(15000);
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .searchListings({
        q: searchQuery || undefined,
        category_id: selectedCategory || undefined,
        radius: radius,
        per_page: 50,
      })
      .then((res) => {
        setListings(res.items);
        if (res.items.length > 0 && !selectedListing) {
          setSelectedListing(res.items[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchQuery, selectedCategory, radius]);

  // Filter listings by open status if enabled
  const displayedListings = useMemo(() => {
    if (!openOnly) return listings;
    return listings.filter((l) => getOpenStatus(l.hours).isOpen);
  }, [listings, openOnly]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Top Filter & Toolbar */}
      <div className="px-4 py-3 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search verified services..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="hidden xl:flex items-center flex-1 max-w-lg overflow-hidden">
          <CategoryChips
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Actions, Filters & View Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Open Now Toggle */}
          <button
            onClick={() => setOpenOnly(!openOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              openOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Open Now</span>
          </button>

          {/* Radius Selector */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Radius:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={5000} className="dark:bg-slate-900">5 km</option>
              <option value={10000} className="dark:bg-slate-900">10 km</option>
              <option value={15000} className="dark:bg-slate-900">15 km</option>
              <option value={25000} className="dark:bg-slate-900">25 km</option>
            </select>
          </div>

          {/* Layout Mode Switcher (Split, Map, List) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setLayoutMode('split')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                layoutMode === 'split'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Split View (List + Compact Map)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>

            <button
              onClick={() => setLayoutMode('map')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                layoutMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>

            <button
              onClick={() => setLayoutMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Directory List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List ({displayedListings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body - Clean Website-First Proportion */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Listings Grid (Primary Focus of the Page) */}
          {(layoutMode === 'split' || layoutMode === 'list') && (
            <div className={`flex-1 space-y-4 ${layoutMode === 'list' ? 'max-w-5xl mx-auto' : ''}`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Town Directory Results</span>
                </span>
                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                  {displayedListings.length} Found
                </span>
              </div>

              {loading ? (
                <LoadingSpinner message="Locating community services..." />
              ) : displayedListings.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2 shadow-xs">
                  <p className="font-semibold text-sm">No services found in this search area.</p>
                  <p className="text-xs text-slate-400">Try expanding the search radius or resetting category filters.</p>
                </div>
              ) : (
                <div className={`grid grid-cols-1 ${layoutMode === 'list' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                  {displayedListings.map((l) => (
                    <div
                      key={l.id}
                      onMouseEnter={() => setSelectedListing(l)}
                      onClick={() => setSelectedListing(l)}
                      className={`cursor-pointer transition-all ${
                        selectedListing?.id === l.id && layoutMode === 'split'
                          ? 'ring-2 ring-blue-500 rounded-2xl scale-[1.01]'
                          : ''
                      }`}
                    >
                      <ListingCard listing={l} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compact Sticky Companion Map (Right Side) */}
          {(layoutMode === 'split' || layoutMode === 'map') && (
            <div className={`${layoutMode === 'map' ? 'w-full h-[650px]' : 'w-full lg:w-[380px] xl:w-[420px] flex-shrink-0'}`}>
              <div className={`${layoutMode === 'split' ? 'sticky top-32 space-y-3' : 'h-full'}`}>
                {layoutMode === 'split' && (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <span>Neighborhood Map</span>
                    <button
                      onClick={() => setLayoutMode('map')}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Expand Map ↗
                    </button>
                  </div>
                )}

                <div className={`${layoutMode === 'split' ? 'h-[360px]' : 'h-full'} rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800`}>
                  <Map
                    listings={displayedListings}
                    selectedListingId={selectedListing?.id}
                    onSelectListing={(l) => setSelectedListing(l)}
                    className="h-full w-full rounded-3xl border-none"
                    autoFitBounds={true}
                  />
                </div>

                {layoutMode === 'split' && selectedListing && (
                  <div className="p-3 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Pin:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{selectedListing.name}</span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">
                      {selectedListing.category?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
