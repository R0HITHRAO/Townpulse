import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, Category } from '../services/api';
import { loadDirectorySnapshot } from '../services/directoryFallback';
import { OfflineDataBanner } from '../components/OfflineDataBanner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSeo } from '../hooks/useSeo';
import { routes } from '../config/site';
import { useCurrentLocation } from '../context/LocationContext';
import { categoryDescriptionKey, categoryNameKey } from '../utils/categoryI18n';
import { Reveal } from '../components/Reveal';

/**
 * Every category, each one linking to its own shareable /c/<slug> page.
 *
 * Counts and the offline fallback both come from the bundled snapshot; the
 * API's category payload has no slug column, so its rows are merged with the
 * snapshot's slugs by id (the /c/<slug> links depend on them).
 */
export const Categories: React.FC = () => {
  const { t } = useTranslation();
  const { location } = useCurrentLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [offlineData, setOfflineData] = useState(false);
  const [loading, setLoading] = useState(true);
  // No default town: name the visitor's chosen place, or a neutral phrase.
  const place = location?.name?.trim() || 'your town';

  useSeo({
    title: t('seo.categoriesTitle', { town: place }),
    description: t('seo.categoriesDescription', { town: place }),
    path: routes.categories,
    ogKey: 'categories',
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await loadDirectorySnapshot();
      const snapshotCategories = snapshot?.categories ?? [];
      const counted: Record<string, number> = {};
      for (const listing of snapshot?.listings ?? []) {
        const key = listing.category?.slug;
        if (key) counted[key] = (counted[key] ?? 0) + 1;
      }

      try {
        const fromApi = await api.getCategories();
        if (!cancelled && fromApi.length > 0) {
          const byId = new Map(snapshotCategories.map((c) => [c.id, c]));
          setCategories(fromApi.map((c) => ({ ...c, slug: c.slug ?? byId.get(c.id)?.slug })));
          setCounts(counted);
          setOfflineData(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }

      if (!cancelled && snapshotCategories.length > 0) {
        setCategories(snapshotCategories);
        setCounts(counted);
        setOfflineData(true);
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <Reveal as="header" direction="blur" className="max-w-2xl space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('categories.heading')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('categories.subheading', { town: place })}
          </p>
        </Reveal>

        {offlineData && <OfflineDataBanner onRetry={() => window.location.reload()} />}

        {loading ? (
          <LoadingSpinner message={t('common.loading')} />
        ) : categories.length === 0 ? (
          <Reveal className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
            {t('categories.empty')}
          </Reveal>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, index) => {
              const nameKey = categoryNameKey(cat.slug);
              const descKey = categoryDescriptionKey(cat.slug);
              const count = cat.slug ? counts[cat.slug] ?? 0 : 0;
              return (
                <Reveal key={cat.id} as="li" direction="up" delay={Math.min(index, 8) * 55} className="h-full">
                  <Link
                    to={`/c/${cat.slug ?? cat.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-400 hover:shadow-lg dark:hover:border-orange-600"
                  >
                    <span className="text-2xl leading-none mb-3" aria-hidden="true">
                      {cat.icon || '📍'}
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                      {nameKey ? t(nameKey, { defaultValue: cat.name }) : cat.name}
                    </span>
                    {(descKey || cat.description) && (
                      <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {descKey ? t(descKey, { defaultValue: cat.description }) : cat.description}
                      </span>
                    )}
                    <span className="mt-3 inline-flex w-fit items-center rounded-full border border-orange-200/60 dark:border-orange-800/60 bg-orange-50/90 dark:bg-orange-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                      {t('categories.listingCount', { count })}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

