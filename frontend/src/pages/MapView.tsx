import React, { useState, useEffect, useMemo } from 'react';
import { Map } from '../components/Map';
import { ListingCard } from '../components/ListingCard';
import { CategoryChips } from '../components/CategoryChips';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DirectionsModal } from '../components/DirectionsModal';
import { Reveal } from '../components/Reveal';
import { api, ApiError, Category, Listing } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';
import { OfflineDataBanner } from '../components/OfflineDataBanner';
import { getOpenStatus } from '../utils/businessHours';
import { town } from '../config/site';
import {
  Search,
  SlidersHorizontal,
  Map as MapIcon,
  List,
  Columns,
  X,
  Clock,
  Sparkles,
  Navigation,
  RefreshCw,
} from 'lucide-react';

type LayoutMode = 'split' | 'map' | 'list';

export const MapView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ApiError['kind'] | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(15000);
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [directionsListing, setDirectionsListing] = useState<Listing | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  // True when we fell back to the bundled offline snapshot, so the page can say
  // so honestly instead of pretending it is live data.
  const [offlineData, setOfflineData] = useState(false);

  // The map is always centred on the configured town, so there is one
  // coordinate pair for both the fetch and the viewport.
  const townCenter = useMemo<[number, number]>(() => [town.lat, town.lng], []);

  const recordError = (err: unknown) => {
    if (err instanceof ApiError) {
      setErrorKind(err.kind);
      setError(err.message);
    } else {
      setErrorKind('server');
      setError(err instanceof Error ? err.message : 'Could not reach the TownPulse server.');
    }
  };

  useEffect(() => {
    // Same reasoning as the listings fetch: a failed category load used to be
    // logged and forgotten, leaving an empty chip row with no explanation.
    api
      .getCategories()
      .then(setCategories)
      .catch(async (err: unknown) => {
        console.error(err);
        const snapshotCategories = await loadSnapshotCategories();
        if (snapshotCategories.length > 0) {
          setCategories(snapshotCategories);
        } else {
          recordError(err);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setErrorKind(null);
    api
      .searchListings({
        q: searchQuery || undefined,
        category_id: selectedCategory || undefined,
        // Send the town centre. Without lat/lng the backend has no origin to
        // apply `radius` to, so the radius selector silently did nothing.
        lat: townCenter[0],
        lng: townCenter[1],
        radius: radius,
        per_page: 100,
      })
      .then((res) => {
        setListings(res.items);
        setOfflineData(false);
        setSelectedListing((current) => current ?? res.items[0] ?? null);
      })
      // A dead backend used to be swallowed into console.error, leaving
      // `listings` empty and rendering "No services found in this search
      // area." — so a broken server was reported to the user as "this town has
      // no services". Now we fall back to the bundled real-data snapshot and
      // tell the visitor what they are looking at.
      .catch(async (err: unknown) => {
        console.error(err);
        const snapshot = await searchSnapshot({
          q: searchQuery || undefined,
          category_id: selectedCategory || undefined,
          lat: townCenter[0],
          lng: townCenter[1],
          radius,
          per_page: 100,
        });
        if (snapshot.items.length > 0) {
          setListings(snapshot.items);
          setOfflineData(true);
          setSelectedListing((current) => current ?? snapshot.items[0] ?? null);
        } else {
          setListings([]);
          recordError(err);
        }
      })
      .finally(() => setLoading(false));
    // `selectedListing` is intentionally read through a functional update and
    // left out of the deps: listing it previously re-ran the fetch on every
    // pin selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, radius, retryKey, townCenter]);

  // Filter listings by open status if enabled
  const displayedListings = useMemo(() => {
    if (!openOnly) return listings;
    return listings.filter((l) => getOpenStatus(l.hours).isOpen);
  }, [listings, openOnly]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Top Filter & Toolbar */}
      <div className="px-4 py-3 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-slide-down">
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
          {offlineData && (
            <OfflineDataBanner
              onRetry={() => setRetryKey((key) => key + 1)}
              className="lg:col-span-2"
            />
          )}
          {/* Main Listings Grid (Primary Focus of the Page) */}
          {(layoutMode === 'split' || layoutMode === 'list') && (
            <div className={`flex-1 space-y-4 ${layoutMode === 'list' ? 'max-w-5xl mx-auto' : ''}`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Town Directory Results</span>
                </span>
                <span
                  key={displayedListings.length}
                  className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full font-bold animate-pop-in"
                >
                  {displayedListings.length} Found
                </span>
              </div>

              {loading ? (
                <LoadingSpinner message="Locating community services..." />
              ) : error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-10 sm:p-12 text-center bg-white dark:bg-slate-900/90 rounded-2xl border border-red-200 dark:border-red-900 text-slate-600 dark:text-slate-300 space-y-3 shadow-xs"
                >
                  <p className="font-semibold text-base text-red-700 dark:text-red-400">
                    {errorKind === 'offline'
                      ? 'You are offline'
                      : errorKind === 'timeout'
                        ? 'The server took too long'
                        : errorKind === 'not-json'
                          ? 'Wrong server response'
                          : 'Could not load services'}
                  </p>
                  {/* Name the broken link in the chain instead of one generic
                      sentence, so the user knows whether to check their phone,
                      their connection, or the backend. */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                    {errorKind === 'offline'
                      ? 'This is not an empty result — your device has no connection. Reconnect and try again.'
                      : errorKind === 'timeout'
                        ? 'The backend accepted the connection but did not answer. It may be starting up, or the database may be unreachable.'
                        : errorKind === 'not-json'
                          ? 'The request was answered with a web page instead of data. This usually means the SPA fallback is handling /api, or a proxy is pointing at the wrong place.'
                          : 'The backend is not answering, so this is not an empty result. Start it with `docker compose up -d`, or `uvicorn app.main:app --reload` in backend/.'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 break-words max-w-lg mx-auto">
                    {error}
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRetryKey((key) => key + 1)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                        setRadius(15000);
                        setRetryKey((key) => key + 1);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Reset filters and reload
                    </button>
                  </div>
                </div>
              ) : displayedListings.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2 shadow-xs">
                  <p className="font-semibold text-sm">No services found in this search area.</p>
                  <p className="text-xs text-slate-400">Try expanding the search radius or resetting category filters.</p>
                  {searchQuery || selectedCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Reset filters
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 pt-1">
                      The directory loaded successfully but has no listings for this area yet.
                      Seed it with <code className="font-mono">python scripts/import_osm.py</code>{' '}
                      to pull real services from OpenStreetMap.
                    </p>
                  )}
                </div>
              ) : (
                <div className={`grid grid-cols-1 ${layoutMode === 'list' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                  {displayedListings.map((l, index) => (
                    <Reveal
                      key={l.id}
                      direction="up"
                      delay={Math.min(index, 7) * 50}
                      className="h-full"
                    >
                      <div
                        onMouseEnter={() => setSelectedListing(l)}
                        onClick={() => setSelectedListing(l)}
                        className={`h-full cursor-pointer transition-all duration-300 ease-fluid ${
                          selectedListing?.id === l.id && layoutMode === 'split'
                            ? 'ring-2 ring-blue-500 rounded-2xl scale-[1.01]'
                            : ''
                        }`}
                      >
                        <ListingCard listing={l} />
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compact Sticky Companion Map (Right Side) */}
          {(layoutMode === 'split' || layoutMode === 'map') && (
            <div
              className={
                // "Map" mode is the full-screen map: it fills the viewport
                // below the sticky toolbar instead of being capped at 550px,
                // which made it look like a broken preview rather than a map.
                layoutMode === 'map'
                  ? 'w-full flex-1 min-h-[calc(100vh-9rem)]'
                  : 'w-full lg:w-[320px] xl:w-[340px] flex-shrink-0'
              }
            >
              <div className={`${layoutMode === 'split' ? 'sticky top-32 space-y-2' : 'h-full'}`}>
                {layoutMode === 'split' && (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <span>Quick Map</span>
                    <button
                      onClick={() => setLayoutMode('map')}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Expand Map ↗
                    </button>
                  </div>
                )}

                <div
                  className={
                    layoutMode === 'split'
                      ? 'h-[240px] rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800'
                      : 'h-full min-h-[calc(100vh-9rem)] rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800'
                  }
                >
                  <Map
                    listings={displayedListings}
                    center={townCenter}
                    zoom={town.zoom}
                    selectedListingId={selectedListing?.id}
                    onSelectListing={(l) => setSelectedListing(l)}
                    className="h-full w-full border-none"
                    autoFitBounds={layoutMode === 'split'}
                    singleMarkerZoom={town.zoom + 1}
                  />
                </div>

                {layoutMode === 'split' && selectedListing && (
                  <div className="p-3 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
                    <div className="truncate flex-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Pin:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{selectedListing.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDirectionsListing(selectedListing)}
                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-amber-100 transition shrink-0"
                      title="Get interactive directions"
                    >
                      <Navigation className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Route</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Directions Modal */}
      {directionsListing && (
        <DirectionsModal
          listing={directionsListing}
          onClose={() => setDirectionsListing(null)}
        />
      )}
    </div>
  );
};
