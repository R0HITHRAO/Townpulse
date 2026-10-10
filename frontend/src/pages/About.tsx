import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Database, ExternalLink, Mail, ShieldCheck } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';
import { site } from '../config/site';
import { useCurrentLocation } from '../context/LocationContext';

/**
 * About & verification.
 *
 * AUDIT.md 4.1 (P0): "verified" was asserted with no visible process. This
 * page is that process, in the order a sceptical reader asks the questions:
 * what a badge means and who checked, where the data came from, and how to
 * correct it. The footer's verification link points at #how-we-verify.
 */
export const About: React.FC = () => {
  const { t } = useTranslation();
  const { location } = useCurrentLocation();
  // No default town: name the place the visitor actually chose, or fall back to
  // a neutral phrase. `site.ts` no longer carries a hardcoded place.
  const place = location?.name?.trim() || 'your town';
  const region = location?.region?.trim() || 'your area';

  useSeo({
    title: t('seo.aboutTitle', { town: place }),
    description: t('seo.aboutDescription', { town: place }),
    path: '/about',
    ogKey: 'about',
  });

  const steps = ['verifyStep1', 'verifyStep2', 'verifyStep3', 'verifyStep4'] as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-slate-900/90 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm animate-rise transition-colors duration-200">
        <header className="space-y-2 border-b border-gray-100 dark:border-slate-800 pb-6">
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            {t('nav.about')}
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('about.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            {t('about.subtitle', { town: place, region })}
          </p>
        </header>

        <section className="space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('about.missionHeading')}
          </h2>
          <p>{t('about.missionBody')}</p>
        </section>

        {/* The anchor the footer's verification link points at. */}
        <section id="how-we-verify" className="space-y-4 scroll-mt-24">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('about.howWeVerifyHeading')}
          </h2>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
            {t('about.howWeVerifyIntro')}
          </p>
          <ol className="space-y-3">
            {steps.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300"
              >
                <CheckCircle2
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{t(`about.${key}`)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
            {t('about.sourcesHeading')}
          </h2>
          <p>{t('about.sourcesBody')}</p>
        </section>

        <section className="space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck
              className="w-4 h-4 text-orange-600 dark:text-orange-400"
              aria-hidden="true"
            />
            {t('about.correctionsHeading')}
          </h2>
          <p>{t('about.correctionsBody')}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition hover:scale-[1.03] active:scale-[0.97]"
            >
              {t('report.title')}
            </Link>
            <Link
              to="/suggest"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('nav.suggest')}
            </Link>
          </div>
        </section>

        <section className="space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('about.privacyHeading')}
          </h2>
          <p>{t('about.privacyBody')}</p>
        </section>

        <footer className="pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <a
            href={`mailto:${site.contactEmail}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            <Mail className="w-3.5 h-3.5" />
            {t('about.contactUs')}
          </a>
          <a
            href={site.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition"
          >
            {t('about.openSource')}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </footer>
      </div>
    </div>
  );
};

