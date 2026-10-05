import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { CategoryChips } from '../components/CategoryChips';
import { ListingCard } from '../components/ListingCard';
import { Map } from '../components/Map';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PrintableDirectoryModal } from '../components/PrintableDirectoryModal';
import { Pagination } from '../components/Pagination';
import { Reveal } from '../components/Reveal';
import { ScrollScene } from '../components/ScrollScene';
import { WorldScene } from '../components/WorldScene';
import { useSeo } from '../hooks/useSeo';
import { getOpenStatus } from '../utils/businessHours';
import { api, Category, Listing, SearchParams } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';
import { OfflineDataBanner } from '../components/OfflineDataBanner';
import { WelcomeExperience } from '../components/WelcomeExperience';
import {
  ArrowDown,
  ArrowRight,
  Clock3,
  Map as MapIcon,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

export const Home: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return window.sessionStorage.getItem('townpulse-welcome-seen') !== 'true';
    } catch {
      return true;
    }
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [printableOpen, setPrintableOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    page: 1,
    per_page: 20,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // True when we fell back to the bundled offline snapshot.
  const [offlineData, setOfflineData] = useState(false);

  useSeo({
    title: 'Local places and services, wherever you are | TownPulse',
    description:
      'Explore community-listed places and essential local services. Search by category or use your location to discover listings nearby.',
    path: '/',
    ogKey: 'home',
  });

  // Load categories. Previously `.catch(console.error)`, which left the chip
  // row silently empty with no explanation.
  useEffect(() => {
    api
      .getCategories()
      .then((items) => {
        setCategories(items);
        setCategoriesUnavailable(false);
      })
      .catch(async () => {
        const snapshotCategories = await loadSnapshotCategories();
        setCategories(snapshotCategories);
        setCategoriesUnavailable(snapshotCategories.length === 0);
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
      .catch(async () => {
        const snapshot = await searchSnapshot(params);
        setListings(snapshot.items);
        setTotalCount(snapshot.total);
        setTotalPages(snapshot.total_pages);
        setOfflineData(true);
      })
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
      sort_by: filters.lat != null && filters.lng != null ? 'distance' : 'created_at',
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

  if (showWelcome) {
    return (
      <WelcomeExperience
        onEnter={() => {
          try {
            window.sessionStorage.setItem('townpulse-welcome-seen', 'true');
          } catch {
            // The guide remains usable when browser storage is unavailable.
          }
          setShowWelcome(false);
          window.requestAnimationFrame(() => {
            document.getElementById('home-heading')?.focus();
          });
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tp-bg)] text-[var(--tp-text)] transition-colors duration-200">
      <section className="tp-home-hero relative isolate overflow-hidden">
        <div className="tp-home-hero__grain" aria-hidden="true" />
        <div className="tp-container relative py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.02fr] lg:gap-10">
            <Reveal direction="left" className="tp-home-hero__copy relative z-10">
              <p className="tp-home-hero__eyebrow mb-5 inline-flex items-center gap-2">
                <span className="tp-welcome__live-dot" />A LOCAL FIELD GUIDE
              </p>
              <h1
                id="home-heading"
                tabIndex={-1}
                className="tp-home-hero__title mb-5 font-[var(--tp-font-display)] text-[clamp(3.1rem,6vw,5.7rem)] font-bold leading-[1.04] tracking-tight max-[680px]:text-[clamp(3.3rem,13vw,5rem)] focus:outline-none"
              >
                Find your way
                <br />
                <span>anywhere.</span>
              </h1>
              <p className="mb-8 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                Search for everyday essentials nearby, or discover the local places that make a new
                destination feel familiar.
              </p>
              <SearchBar onSearch={handleHeroSearch} initialOpenOnly={openOnly} />
              <a
                href="#directory-results"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                Explore what’s nearby
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </a>
            </Reveal>

            <Reveal
              direction="scale"
              threshold={0.05}
              className="tp-home-hero__visual tp-scene-frame relative mx-auto w-full max-w-2xl lg:ml-auto"
            >
              <ScrollScene className="tp-home-hero__depth">
                <div className="tp-home-hero__scene">
                  <WorldScene />
                  <div className="tp-home-hero__scene-label">
                    <span className="tp-home-hero__scene-icon">
                      <MapPin aria-hidden="true" />
                    </span>
                    <span>
                      <small>LOCAL DISCOVERY</small>
                      <strong>Start wherever you are</strong>
                    </span>
                  </div>
                  <div className="tp-home-hero__scene-counter">
                    <strong>{totalCount}</strong>
                    <span>
                      places in
                      <br />
                      your results
                    </span>
                  </div>
                  <div className="tp-home-hero__scene-caption">
                    <span className="tp-home-hero__scene-line" />
                    <span>THE WORLD, THROUGH LOCAL EYES</span>
                  </div>
                </div>
              </ScrollScene>
            </Reveal>
          </div>
        </div>
      </section>

      <main className="tp-home-main w-full flex-1">
        <Reveal
          as="section"
          aria-labelledby="browse-heading"
          direction="left"
          className="tp-container tp-home-browse"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
                Find what you need
              </p>
              <h2
                id="browse-heading"
                className="font-[var(--tp-font-display)] text-2xl font-bold text-[var(--tp-text)] sm:text-3xl"
              >
                Browse by category
              </h2>
            </div>
            <Link
              to="/map"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--tp-border-strong)] bg-[var(--tp-surface)] px-4 text-sm font-semibold text-[var(--tp-text)] transition hover:border-[var(--tp-primary)] hover:text-[var(--tp-primary)]"
            >
              <MapIcon aria-hidden="true" className="h-4 w-4" />
              View map
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          {categoriesUnavailable && (
            <p
              role="status"
              className="mb-3 rounded-xl border border-[var(--tp-warn)]/30 bg-[var(--tp-warn-soft)] px-4 py-3 text-sm text-[var(--tp-warn-soft-text)]"
            >
              Categories are temporarily unavailable. You can still search all listed places below.
            </p>
          )}
          <ScrollScene className="tp-home-browse__depth">
            <div className="tp-home-browse__chips rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-3 shadow-[var(--tp-shadow-xs)] sm:p-4">
              <CategoryChips
                categories={categories}
                selectedCategoryId={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
          </ScrollScene>
        </Reveal>

        <Reveal
          as="section"
          id="directory-results"
          aria-labelledby="results-heading"
          direction="up"
          threshold={0.01}
          className="tp-container tp-home-directory scroll-mt-24"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tp-border)] pb-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-text-subtle)]">
                The local directory
              </p>
              <h2
                id="results-heading"
                className="flex items-center gap-3 font-[var(--tp-font-display)] text-2xl font-bold text-[var(--tp-text)]"
              >
                {selectedCategoryObj?.name ?? 'Places to know'}
                <span
                  aria-live="polite"
                  className="rounded-full bg-[var(--tp-surface-2)] px-2.5 py-1 font-[var(--tp-font-body)] text-xs font-semibold text-[var(--tp-text-muted)]"
                >
                  {totalCount}
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tp-text-subtle)]">
                <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
                Refine
              </span>
              <button
                type="button"
                aria-pressed={openOnly}
                onClick={() => setOpenOnly((value) => !value)}
                className={`tp-btn min-h-11 rounded-xl border px-3 text-xs ${openOnly ? 'border-[var(--tp-accent)] bg-[var(--tp-accent-soft)] text-[var(--tp-accent-soft-text)]' : 'border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:border-[var(--tp-border-strong)]'}`}
              >
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                Open now
              </button>
              <button
                type="button"
                aria-pressed={verifiedOnly}
                onClick={() => setVerifiedOnly((value) => !value)}
                className={`tp-btn min-h-11 rounded-xl border px-3 text-xs ${verifiedOnly ? 'border-[var(--tp-accent)] bg-[var(--tp-accent-soft)] text-[var(--tp-accent-soft-text)]' : 'border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:border-[var(--tp-border-strong)]'}`}
              >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Verified
              </button>
              <button
                type="button"
                onClick={() => setPrintableOpen(true)}
                className="tp-btn min-h-11 rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] px-3 text-xs text-[var(--tp-text-muted)] hover:border-[var(--tp-border-strong)] hover:text-[var(--tp-text)]"
                title="Print Emergency Services Directory"
              >
                <Printer aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pocket guide</span>
              </button>
              {(selectedCategory !== null || verifiedOnly || openOnly || searchParams.q) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="tp-btn min-h-11 rounded-xl px-3 text-xs text-[var(--tp-text-subtle)] hover:text-[var(--tp-urgent)]"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {offlineData && (
            <div className="mb-5">
              <OfflineDataBanner onRetry={() => setSearchParams((prev) => ({ ...prev }))} />
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {loading ? (
                <LoadingSpinner message="Searching local services..." />
              ) : displayedListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--tp-border-strong)] bg-[var(--tp-surface)] px-6 py-14 text-center">
                  <MapPin
                    aria-hidden="true"
                    className="mx-auto mb-4 h-8 w-8 text-[var(--tp-text-subtle)]"
                  />
                  <h3 className="mb-2 font-[var(--tp-font-display)] text-xl font-bold text-[var(--tp-text)]">
                    No places found just yet
                  </h3>
                  <p className="mb-5 text-sm text-[var(--tp-text-muted)]">
                    Try another category or add a local service you know.
                  </p>
                  <Link to="/submit" className="tp-btn tp-btn-primary">
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add a local place
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {displayedListings.map((listing, index) => (
                    <ScrollScene key={listing.id} className="h-full">
                      <Reveal direction="up" delay={Math.min(index, 7) * 40} className="h-full">
                        <ListingCard listing={listing} />
                      </Reveal>
                    </ScrollScene>
                  ))}
                </div>
              )}

              {!loading && (
                <Pagination
                  page={searchParams.page ?? 1}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setSearchParams((prev) => ({ ...prev, page }));
                    document
                      .getElementById('directory-results')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="pt-6"
                />
              )}
            </div>

            <section aria-label="Map of local search results">
              <Reveal direction="right" threshold={0.08} className="lg:sticky lg:top-24">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-text-subtle)]">
                      Search area
                    </p>
                    <h3 className="mt-1 font-[var(--tp-font-display)] text-lg font-bold text-[var(--tp-text)]">
                      Places near your search
                    </h3>
                  </div>
                  <Link to="/map" aria-label="Open full map" className="tp-btn-icon">
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
                <ScrollScene className="tp-home-map-depth">
                  <Map
                    listings={displayedListings}
                    center={
                      searchParams.lat != null && searchParams.lng != null
                        ? [searchParams.lat, searchParams.lng]
                        : [20, 0]
                    }
                    zoom={searchParams.lat != null && searchParams.lng != null ? undefined : 2}
                    className="h-[260px] overflow-hidden rounded-2xl border border-[var(--tp-border)] shadow-[var(--tp-shadow-sm)]"
                  />
                </ScrollScene>
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[var(--tp-text-subtle)]">
                  <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Map pins reflect the places in your current results.
                </p>
              </Reveal>
            </section>
          </div>
        </Reveal>
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
