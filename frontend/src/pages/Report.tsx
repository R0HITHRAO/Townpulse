import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Flag } from 'lucide-react';
import { api } from '../services/api';
import { useSeo } from '../hooks/useSeo';
import { routes } from '../config/site';

/** Any UUID inside the pasted value, so a full /listings/<id> URL works. */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const inputClass =
  'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/40 outline-none';

/**
 * Global report page (AUDIT.md 2.4): reachable and shareable, usable without
 * an account (the backend accepts anonymous reports into the same
 * three-reports-escalate pipeline), and linkable from any listing.
 *
 * "Which listing" accepts a pasted link, a raw id, or a name — a name is
 * resolved through search so no one has to hunt for the URL.
 */
export const Report: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [which, setWhich] = useState(() => {
    const listing = searchParams.get('listing');
    return listing ? `/listings/${listing}` : '';
  });
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name?: string } | null>(null);

  useSeo({
    title: t('seo.reportTitle'),
    description: t('seo.reportDescription'),
    path: routes.report,
    ogKey: 'report',
  });

  /** Resolve a pasted link / id / name into a listing the API can address. */
  const resolveListing = async (input: string): Promise<{ id: string; name?: string } | null> => {
    const uuid = input.match(UUID_RE);
    if (uuid) return { id: uuid[0] };
    const query = input.trim();
    if (!query) return null;
    try {
      const res = await api.searchListings({ q: query, per_page: 5 });
      const first = res.items[0];
      if (first) return { id: first.id, name: first.name };
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!which.trim()) {
      setError(t('report.noListing'));
      return;
    }
    if (reason.trim().length < 10) {
      setError(t('report.noReason'));
      return;
    }
    setSending(true);
    try {
      const listing = await resolveListing(which);
      if (!listing) {
        setError(t('report.error'));
        return;
      }
      const payload = detail.trim() ? `${reason.trim()} — ${detail.trim()}` : reason.trim();
      await api.reportListing(listing.id, payload.slice(0, 1000));
      setDone({ name: listing.name });
    } catch (err) {
      console.error(err);
      setError(t('report.error'));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setWhich('');
    setReason('');
    setDetail('');
    setDone(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <header className="space-y-2">
          <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-2xl">
            <Flag className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('report.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('report.subtitle')}</p>
        </header>

        {done ? (
          <div className="bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('report.successTitle')}
            </h2>
            {done.name && (
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{done.name}</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('report.successBody')}</p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-sm transition hover:scale-[1.03] active:scale-[0.97]"
            >
              {t('report.another')}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
          >
            <div>
              <label
                htmlFor="report-listing"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('report.whichListing')}
              </label>
              <input
                id="report-listing"
                type="text"
                value={which}
                onChange={(e) => setWhich(e.target.value)}
                placeholder={t('report.listingPlaceholder')}
                className={`min-h-[44px] ${inputClass}`}
              />
            </div>

            <div>
              <label
                htmlFor="report-reason"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('report.reason')}
              </label>
              <textarea
                id="report-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('report.reasonPlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="report-detail"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('report.detail')}
              </label>
              <textarea
                id="report-detail"
                rows={2}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={t('report.detailPlaceholder')}
                className={inputClass}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl px-3 py-2"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('report.anonymous')}
              </p>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition hover:scale-[1.03] active:scale-[0.97]"
              >
                {sending ? t('report.sending') : t('report.submit')}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="font-semibold text-orange-600 dark:text-orange-400 hover:underline">
            {t('common.backHome')}
          </Link>
        </p>
      </div>
    </div>
  );
};
