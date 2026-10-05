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
        const snapshotCategories = await loadSnapshotCategories();
        if (snapshotCategories.length > 0) {
          setCategories(snapshotCategories);
        } else {
          recordError(err);
        }
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setErrorKind(null);
    let currentRequest = true;
    const requestTimer = window.setTimeout(
      () => {
        const params = {
          q: searchQuery || undefined,
          category_id: selectedCategory || undefined,
          lat: townCenter[0],
          lng: townCenter[1],
          radius,
          per_page: 100,
        };

        api
          .searchListings(params)
          .then((res) => {
            if (!currentRequest) return;
            setListings(res.items);
            setOfflineData(false);
            setSelectedListing(res.items[0] ?? null);
          })
          .catch(async (err: unknown) => {
            if (!currentRequest) return;
            const snapshot = await searchSnapshot(params);
            if (!currentRequest) return;
            if (snapshot.available) {
              setListings(snapshot.items);
              setOfflineData(true);
              setSelectedListing(snapshot.items[0] ?? null);
            } else {
              setListings([]);
              setSelectedListing(null);
              recordError(err);
            }
          })
          .finally(() => {
            if (currentRequest) setLoading(false);
          });
      },
      searchQuery ? 280 : 0
    );

    return () => {
      currentRequest = false;
      window.clearTimeout(requestTimer);
    };
  }, [searchQuery, selectedCategory, radius, retryKey, townCenter]);

  // Filter listings by open status if enabled
  const displayedListings = useMemo(() => {
    if (!openOnly) return listings;
    return listings.filter((l) => getOpenStatus(l.hours).isOpen);
  }, [listings, openOnly]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[var(--tp-bg)] text-[var(--tp-text)] transition-colors duration-200">
      {/* Top Filter & Toolbar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--tp-border)] bg-[var(--tp-surface)]/95 px-4 py-3 shadow-[var(--tp-shadow-xs)] backdrop-blur-md sm:px-6">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 h-4 w-4 text-[var(--tp-text-subtle)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search verified services..."
            aria-label="Search services on the map"
            className="min-h-11 w-full rounded-xl border border-[var(--tp-border-strong)] bg-[var(--tp-surface)] py-2 pl-9 pr-10 text-sm text-[var(--tp-text)] placeholder:text-[var(--tp-text-subtle)] focus:border-[var(--tp-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--tp-primary)]/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear map search"
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--tp-text-subtle)] hover:bg-[var(--tp-surface-2)] hover:text-[var(--tp-text)]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex w-full min-w-0 items-center overflow-hidden xl:max-w-lg xl:flex-1">
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
            type="button"
            aria-pressed={openOnly}
            onClick={() => setOpenOnly((value) => !value)}
            className={`tp-btn min-h-11 rounded-xl border px-3 text-xs ${
              openOnly
                ? 'border-[var(--tp-accent)] bg-[var(--tp-accent-soft)] text-[var(--tp-accent-soft-text)]'
                : 'border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:bg-[var(--tp-surface-2)]'
            }`}
          >
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Open Now</span>
          </button>

          {/* Radius Selector */}
          <label className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface-2)] px-3 text-xs font-semibold text-[var(--tp-text-muted)]">
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Radius:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              aria-label="Search radius"
              className="cursor-pointer border-0 bg-transparent text-xs font-bold text-[var(--tp-text)] focus:outline-none"
            >
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={15000}>15 km</option>
              <option value={25000}>25 km</option>
            </select>
          </label>

          {/* Layout Mode Switcher (Split, Map, List) */}
          <div className="flex rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface-2)] p-1">
            <button
              type="button"
              aria-pressed={layoutMode === 'split'}
              onClick={() => setLayoutMode('split')}
              className={`flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition ${
                layoutMode === 'split'
                  ? 'bg-[var(--tp-surface)] text-[var(--tp-primary)] shadow-[var(--tp-shadow-xs)]'
                  : 'text-[var(--tp-text-muted)] hover:text-[var(--tp-text)]'
              }`}
              title="Split View (List + Compact Map)"
            >
              <Columns aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>

            <button
              type="button"
              aria-pressed={layoutMode === 'map'}
              onClick={() => setLayoutMode('map')}
              className={`flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition ${
                layoutMode === 'map'
                  ? 'bg-[var(--tp-surface)] text-[var(--tp-primary)] shadow-[var(--tp-shadow-xs)]'
                  : 'text-[var(--tp-text-muted)] hover:text-[var(--tp-text)]'
              }`}
              title="Map View"
            >
              <MapIcon aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>

            <button
              type="button"
              aria-pressed={layoutMode === 'list'}
              onClick={() => setLayoutMode('list')}
              className={`flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition ${
                layoutMode === 'list'
                  ? 'bg-[var(--tp-surface)] text-[var(--tp-primary)] shadow-[var(--tp-shadow-xs)]'
                  : 'text-[var(--tp-text-muted)] hover:text-[var(--tp-text)]'
              }`}
              title="Directory List View"
            >
              <List aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List ({displayedListings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body - Clean Website-First Proportion */}
      <div className="tp-container w-full flex-1 py-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
              Explore the neighborhood
            </p>
            <h1 className="font-[var(--tp-font-display)] text-3xl font-bold tracking-tight text-[var(--tp-text)] sm:text-4xl">
              Around {town.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--tp-text-muted)]">
              Find a place in the directory, then see where it is and plan your visit.
            </p>
          </div>
          <span className="rounded-full border border-[var(--tp-border)] bg-[var(--tp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--tp-text-muted)]">
            {displayedListings.length} places in view
          </span>
        </header>
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
                  className="space-y-3 rounded-2xl border border-[var(--tp-urgent)]/35 bg-[var(--tp-surface)] p-10 text-center text-[var(--tp-text-muted)] shadow-[var(--tp-shadow-xs)] sm:p-12"
                >
                  <p className="text-base font-semibold text-[var(--tp-urgent)]">
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
                  <p className="mx-auto max-w-lg text-sm leading-relaxed text-[var(--tp-text-muted)]">
                    {errorKind === 'offline'
                      ? 'This is not an empty result — your device has no connection. Reconnect and try again.'
                      : errorKind === 'timeout'
                        ? 'The backend accepted the connection but did not answer. It may be starting up, or the database may be unreachable.'
                        : errorKind === 'not-json'
                          ? 'The request was answered with a web page instead of data. This usually means the SPA fallback is handling /api, or a proxy is pointing at the wrong place.'
                          : 'The backend is not answering, so this is not an empty result. Start it with `docker compose up -d`, or `uvicorn app.main:app --reload` in backend/.'}
                  </p>
                  <p className="mx-auto max-w-lg break-words font-mono text-[11px] text-[var(--tp-text-subtle)]">
                    {error}
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRetryKey((key) => key + 1)}
                      className="tp-btn tp-btn-primary rounded-xl"
                    >
                      <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
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
                      className="tp-btn tp-btn-secondary rounded-xl"
                    >
                      Reset filters and reload
                    </button>
                  </div>
                </div>
              ) : displayedListings.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2 shadow-xs">
                  <p className="font-semibold text-sm">No services found in this search area.</p>
                  <p className="text-xs text-slate-400">
                    Try expanding the search radius or resetting category filters.
                  </p>
                  {searchQuery || selectedCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="tp-btn tp-btn-secondary mt-2 rounded-xl"
                    >
                      Reset filters
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 pt-1">
                      The directory loaded successfully but has no listings for this area yet. Seed
                      it with <code className="font-mono">python scripts/import_osm.py</code> to
                      pull real services from OpenStreetMap.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className={`grid grid-cols-1 ${layoutMode === 'list' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}
                >
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
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--tp-text-subtle)]">
                    <span>Map preview</span>
                    <button
                      type="button"
                      onClick={() => setLayoutMode('map')}
                      className="min-h-11 font-semibold text-[var(--tp-primary)] hover:underline"
                    >
                      Expand Map ↗
                    </button>
                  </div>
                )}

                <div
                  className={
                    layoutMode === 'split'
                      ? 'h-[260px] overflow-hidden rounded-2xl border border-[var(--tp-border)] shadow-[var(--tp-shadow-xs)]'
                      : 'h-full min-h-[calc(100vh-9rem)] overflow-hidden rounded-2xl border border-[var(--tp-border)] shadow-[var(--tp-shadow-sm)]'
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
                    scrollWheelZoom={layoutMode === 'map'}
                  />
                </div>

                {layoutMode === 'split' && selectedListing && (
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-3 shadow-[var(--tp-shadow-xs)]">
                    <div className="truncate flex-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Selected Pin:
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                        {selectedListing.name}
                      </span>
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
        <DirectionsModal listing={directionsListing} onClose={() => setDirectionsListing(null)} />
      )}
    </div>
  );
};
