import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Printer, ShieldAlert } from 'lucide-react';
import { emergencyContacts, routes, town } from '../config/site';
import { useSeo } from '../hooks/useSeo';
import { searchSnapshot } from '../services/directoryFallback';
import { Listing } from '../services/api';

/**
 * Emergency numbers, first and largest.
 *
 * This is the page that must work when everything else fails: no backend, no
 * connection, a dying battery. Every number is either sourced from
 * `site.defaults.json` or explicitly marked "not yet collected" — it never
 * guesses a phone number for someone in a hurry (AUDIT.md 2.2, 4.2).
 *
 * Nearby services come from the bundled offline snapshot rather than the API,
 * so the page's usefulness never depends on a live request, and the route is
 * pre-rendered and precached for offline use.
 */
export const Emergency: React.FC = () => {
  const { t } = useTranslation();
  const [nearby, setNearby] = useState<Listing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useSeo({
    title: t('seo.emergencyTitle', { town: town.name }),
    description: t('seo.emergencyDescription', { town: town.name }),
    path: routes.emergency,
    ogKey: 'emergency',
  });

  useEffect(() => {
    let cancelled = false;
    searchSnapshot({ category_id: 'shelter', per_page: 8, sort_by: 'distance' })
      .then((res) => {
        if (!cancelled && res.available) setNearby(res.items);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <header className="text-center space-y-3">
          <div className="inline-flex p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-2xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('emergency.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            {t('emergency.subtitle', { town: town.name })}
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs hover:scale-105 active:scale-95 transition"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {t('common.printPage')}
          </button>
        </header>

        <section aria-label={t('emergency.title')}>
          <ul className="space-y-2.5">
            {emergencyContacts.map((contact) => (
              <li
                key={contact.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {t(contact.labelKey)}
                  </p>
                  {contact.noteKey && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t(contact.noteKey)}</p>
                  )}
                  {!contact.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('emergency.noNumberBody')}
                    </p>
                  )}
                </div>
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    aria-label={`${t('emergency.callNow')} — ${t(contact.labelKey)}`}
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition hover:scale-[1.03] active:scale-[0.97] flex-shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone}</span>
                  </a>
                ) : (
                  <span className="flex-shrink-0 max-w-[45%] text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl">
                    {t('emergency.noNumber')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
            {t('emergency.howToFind')}
          </h2>
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            {t('emergency.howToFindBody')}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('emergency.nearbyHeading', { town: town.name })}
          </h2>
          {loaded && nearby.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('emergency.nearbyEmpty', { town: town.name })}
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nearby.map((item) => (
                <li
                  key={item.id}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs"
                >
                  <Link
                    to={`/listings/${item.id}`}
                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition line-clamp-1"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{item.address}</span>
                  </p>
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {item.phone}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
