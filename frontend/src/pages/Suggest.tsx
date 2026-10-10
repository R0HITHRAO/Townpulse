import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, PlusCircle } from 'lucide-react';
import { ListingForm } from '../components/ListingForm';
import { api, Listing } from '../services/api';
import { useSeo } from '../hooks/useSeo';
import { routes } from '../config/site';
import { useCurrentLocation } from '../context/LocationContext';

/**
 * "Suggest a listing" — the promise is explicit: no account needed.
 *
 * Anonymous submissions are accepted by `POST /listings`, which stores them
 * unverified and pending moderation. Bouncing a resident to a login wall
 * before they can share local knowledge is how a directory stops receiving
 * any — and the About page makes the same "no account" promise for reports.
 */
export const Suggest: React.FC = () => {
  const { t } = useTranslation();
  const { location } = useCurrentLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // No default town: name the visitor's chosen place, or a neutral phrase.
  const place = location?.name?.trim() || 'your town';

  useSeo({
    title: t('seo.suggestTitle', { town: place }),
    description: t('seo.suggestDescription', { town: place }),
    path: routes.suggest,
    ogKey: 'suggest',
  });

  const handleSubmit = async (data: Partial<Listing>) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createListing(data);
      setDone(created.name);
    } catch {
      setError(t('suggest.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-2xl">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('suggest.title')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 max-w-md mx-auto">
            {t('suggest.subtitle')}
          </p>
        </header>

        {done ? (
          <div className="bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('suggest.successTitle')}
            </h2>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{done}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('suggest.successBody')}</p>
            <button
              type="button"
              onClick={() => setDone(null)}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-sm transition hover:scale-[1.03] active:scale-[0.97]"
            >
              {t('suggest.another')}
            </button>
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl px-3 py-2"
              >
                {error}
              </p>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              {t('suggest.privacyNote')}
            </p>

            <ListingForm
              onSubmit={handleSubmit}
              submitLabel={t('suggest.submit')}
              isSubmitting={submitting}
            />
          </>
        )}

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          <Link
            to="/"
            className="font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            {t('common.backHome')}
          </Link>
        </p>
      </div>
    </div>
  );
};
