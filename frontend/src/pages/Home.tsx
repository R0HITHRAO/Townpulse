import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { CategoryChips } from '../components/CategoryChips';
import { ListingCard } from '../components/ListingCard';
import { Map } from '../components/Map';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PrintableDirectoryModal } from '../components/PrintableDirectoryModal';
import { Pagination } from '../components/Pagination';
import { Reveal } from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';
import { town, townLabel } from '../config/site';
import { getOpenStatus } from '../utils/businessHours';
import { api, Category, Listing, SearchParams } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';
import { OfflineDataBanner } from '../components/OfflineDataBanner';
import {
  ArrowDown,
  ArrowRight,
  Clock3,
  Compass,
  Map as MapIcon,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

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
    <div className="flex min-h-screen flex-col bg-[var(--tp-bg)] text-[var(--tp-text)] transition-colors duration-200">
      <section className="relative overflow-hidden border-b border-[var(--tp-border)] bg-[radial-gradient(ellipse_at_80%_0%,var(--tp-primary-soft),transparent_48%),linear-gradient(145deg,var(--tp-surface),var(--tp-bg-subtle))]">
        <div className="tp-container relative py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div className="max-w-2xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--tp-border)] bg-[var(--tp-surface)] px-3.5 py-2 text-xs font-semibold tracking-wide text-[var(--tp-accent)] shadow-[var(--tp-shadow-xs)]">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                MADE FOR {town.name.toUpperCase()} · {town.region.toUpperCase()}
              </p>
              <h1 className="mb-5 font-[var(--tp-font-display)] text-4xl font-bold leading-[1.04] tracking-tight text-[var(--tp-text)] sm:text-5xl lg:text-6xl">
                Good local help,
                <br />
                <span className="text-[var(--tp-primary)]">right around</span> you.
              </h1>
              <p className="mb-8 max-w-xl text-base leading-relaxed text-[var(--tp-text-muted)] sm:text-lg">
                Find the people and essential services that keep {town.name} moving. Clear details, useful directions, all in one local guide.
              </p>
              <SearchBar onSearch={handleHeroSearch} initialOpenOnly={openOnly} />
              <a
                href="#directory-results"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-primary)]"
              >
                Explore the local directory
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div aria-hidden="true" className="absolute -inset-4 rounded-[2.5rem] border border-[var(--tp-border)] opacity-60" />
              <div className="relative overflow-hidden rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-6 shadow-[var(--tp-shadow-lg)] sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--tp-accent-soft)] text-[var(--tp-accent)]">
                    <Compass aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-[var(--tp-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--tp-accent-soft-text)]">
                    Your town, at a glance
                  </span>
                </div>
                <p className="mb-1 text-sm font-medium text-[var(--tp-text-muted)]">A community guide to</p>
                <p className="mb-7 font-[var(--tp-font-display)] text-3xl font-bold tracking-tight text-[var(--tp-text)]">
                  {townLabel}
                </p>
                <div className="grid grid-cols-2 divide-x divide-[var(--tp-border)] border-y border-[var(--tp-border)] py-5">
                  <div className="pr-4">
                    <p className="font-[var(--tp-font-display)] text-3xl font-bold text-[var(--tp-primary)]">{totalCount}</p>
                    <p className="mt-1 text-xs font-medium text-[var(--tp-text-muted)]">local places listed</p>
                  </div>
                  <div className="pl-5">
                    <p className="font-[var(--tp-font-display)] text-3xl font-bold text-[var(--tp-accent)]">{categories.length}</p>
                    <p className="mt-1 text-xs font-medium text-[var(--tp-text-muted)]">ways to find help</p>
                  </div>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-[var(--tp-text-subtle)]">
                  Listings are community-submitted and locally verified where marked. Check details before you travel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="tp-container w-full flex-1 py-10 sm:py-12">
        <section aria-labelledby="browse-heading" className="mb-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">Find what you need</p>
              <h2 id="browse-heading" className="font-[var(--tp-font-display)] text-2xl font-bold text-[var(--tp-text)] sm:text-3xl">
                Browse by category
              </h2>
            </div>
            <Link to="/map" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--tp-border-strong)] bg-[var(--tp-surface)] px-4 text-sm font-semibold text-[var(--tp-text)] transition hover:border-[var(--tp-primary)] hover:text-[var(--tp-primary)]">
              <MapIcon aria-hidden="true" className="h-4 w-4" />
              View map
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-3 shadow-[var(--tp-shadow-xs)] sm:p-4">
            <CategoryChips
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </section>

        <section id="directory-results" aria-labelledby="results-heading" className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tp-border)] pb-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-text-subtle)]">The local directory</p>
              <h2 id="results-heading" className="flex items-center gap-3 font-[var(--tp-font-display)] text-2xl font-bold text-[var(--tp-text)]">
                {selectedCategoryObj?.name ?? 'Places to know'}
                <span aria-live="polite" className="rounded-full bg-[var(--tp-surface-2)] px-2.5 py-1 font-[var(--tp-font-body)] text-xs font-semibold text-[var(--tp-text-muted)]">
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

          {offlineData && <div className="mb-5"><OfflineDataBanner onRetry={() => setSearchParams((prev) => ({ ...prev }))} /></div>}

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {loading ? (
                <LoadingSpinner message="Searching local services..." />
              ) : displayedListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--tp-border-strong)] bg-[var(--tp-surface)] px-6 py-14 text-center">
                  <MapPin aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-[var(--tp-text-subtle)]" />
                  <h3 className="mb-2 font-[var(--tp-font-display)] text-xl font-bold text-[var(--tp-text)]">No places found just yet</h3>
                  <p className="mb-5 text-sm text-[var(--tp-text-muted)]">Try another category or add a local service you know.</p>
                  <Link to="/submit" className="tp-btn tp-btn-primary">
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add a local place
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {displayedListings.map((listing, index) => (
                    <Reveal key={listing.id} direction="up" delay={Math.min(index, 7) * 40} className="h-full">
                      <ListingCard listing={listing} />
                    </Reveal>
                  ))}
                </div>
              )}

              {!loading && (
                <Pagination
                  page={searchParams.page ?? 1}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setSearchParams((prev) => ({ ...prev, page }));
                    document.getElementById('directory-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="pt-6"
                />
              )}
            </div>

            <aside className="lg:sticky lg:top-24">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-text-subtle)]">Get your bearings</p>
                  <h3 className="mt-1 font-[var(--tp-font-display)] text-lg font-bold text-[var(--tp-text)]">Around {town.name}</h3>
                </div>
                <Link to="/map" aria-label="Open full map" className="tp-btn-icon">
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
              <Map listings={displayedListings} className="h-[260px] overflow-hidden rounded-2xl border border-[var(--tp-border)] shadow-[var(--tp-shadow-sm)]" />
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[var(--tp-text-subtle)]">
                <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Map pins reflect the places in your current results.
              </p>
            </aside>
          </div>
        </section>
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
