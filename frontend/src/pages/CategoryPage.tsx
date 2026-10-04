import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, Category, Listing } from '../services/api';
import { loadDirectorySnapshot, searchSnapshot } from '../services/directoryFallback';
import { ListingCard } from '../components/ListingCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OfflineDataBanner } from '../components/OfflineDataBanner';
import { Pagination } from '../components/Pagination';
import { Reveal } from '../components/Reveal';
import { absoluteUrl, useSeo } from '../hooks/useSeo';
import { town } from '../config/site';
import { categoryDescriptionKey, categoryNameKey } from '../utils/categoryI18n';

const PER_PAGE = 12;

/**
 * One category and its listings, on its own shareable URL (/c/<slug>) —
 * AUDIT.md 2.3: "cannot send the mechanics in town to a neighbour" is fixed
 * here, with a real title, description, canonical and JSON-LD.
 *
 * Slugs live in the bundled snapshot (the API's category payload has no slug
 * column), so the snapshot maps a slug to a category id; a numeric id also
 * works (/c/4) so API-only deployments can still link.
 */
export const CategoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offlineData, setOfflineData] = useState(false);

  const nameKey = categoryNameKey(category?.slug);
  const categoryLabel = category
    ? nameKey
      ? t(nameKey, { defaultValue: category.name })
      : category.name
    : '';
  const descKey = categoryDescriptionKey(category?.slug);
  const categoryDescription = category
    ? descKey
      ? t(descKey, { defaultValue: category.description })
      : category.description ?? ''
    : '';

  useSeo({
    title: category
      ? t('seo.categoryTitle', { category: categoryLabel, town: town.name })
      : t('common.loading'),
    description: category
      ? t('seo.categoryDescription', {
          category: categoryLabel,
          town: town.name,
          region: town.region,
        })
      : t('seo.categoriesDescription', { town: town.name }),
    path: `/c/${slug}`,
    ogKey: `category-${slug}`,
    jsonLd: category
      ? {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${categoryLabel}, ${town.name}`,
          url: absoluteUrl(`/c/${slug}`),
          about: { '@type': 'Place', name: `${town.name}, ${town.region}` },
        }
      : undefined,
  });

  // Resolve slug (or numeric id) → category; the snapshot owns slug mapping.
  useEffect(() => {
    let cancelled = false;
    setCategory(null);
    setNotFound(false);
    setPage(1);

    void (async () => {
      const snapshot = await loadDirectorySnapshot();
      const snapshotCategories = snapshot?.categories ?? [];
      const numeric = Number(slug);
      const fromSnapshot =
        snapshotCategories.find((c) => c.slug === slug) ??
        (Number.isFinite(numeric)
          ? snapshotCategories.find((c) => c.id === numeric)
          : undefined);

      if (fromSnapshot) {
        if (!cancelled) setCategory(fromSnapshot);
        return;
      }

      try {
        const fromApi = await api.getCategories();
        const match = Number.isFinite(numeric)
          ? fromApi.find((c) => c.id === numeric)
          : undefined;
        if (!cancelled) {
          if (match) setCategory(match);
          else setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Category listings: API first (numeric id), snapshot fallback (slug/id).
  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setLoading(true);

    api
      .searchListings({
        category_id: category.id,
        page,
        per_page: PER_PAGE,
        sort_by: 'name',
        sort_order: 'asc',
      })
      .then((res) => {
        if (cancelled) return;
        setListings(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setOfflineData(false);
      })
      .catch(async (err: unknown) => {
        console.error(err);
        const snapshot = await searchSnapshot({
          category_id: category.slug ?? category.id,
          page,
          per_page: PER_PAGE,
          sort_by: 'name',
        });
        if (cancelled) return;
        setListings(snapshot.items);
        setTotal(snapshot.total);
        setTotalPages(snapshot.total_pages);
        setOfflineData(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, page, retryKey]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t('error.notFoundTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('error.notFoundBody')}</p>
        <Link
          to="/categories"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('empty.browseCategories')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <nav
          aria-label={t('nav.categories')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          <Link
            to="/categories"
            className="inline-flex items-center gap-1 min-h-[32px] hover:text-orange-600 dark:hover:text-orange-400 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('nav.categories')}
          </Link>
        </nav>

        <header className="max-w-2xl space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {categoryLabel || t('common.loading')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {categoryDescription || t('categories.subheading', { town: town.name })}
          </p>
        </header>

        {offlineData && <OfflineDataBanner onRetry={() => setRetryKey((key) => key + 1)} />}

        {loading ? (
          <LoadingSpinner message={t('common.loading')} />
        ) : listings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('empty.categoryTitle')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('empty.categoryBody')}</p>
            <Link
              to="/suggest"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
              {t('empty.suggest')}
            </Link>
          </div>
        ) : (
          <>
            <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
              {t('categories.listingCount', { count: total })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing, index) => (
                <Reveal
                  key={listing.id}
                  direction="up"
                  delay={Math.min(index, 7) * 45}
                  className="h-full"
                >
                  <ListingCard listing={listing} />
                </Reveal>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="pt-2" />
          </>
        )}
      </div>
    </div>
  );
};
