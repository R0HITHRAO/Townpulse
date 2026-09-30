import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../hooks/useSeo';
import { Compass, MapPin, Map as MapIcon, PlusCircle } from 'lucide-react';

export const NotFound: React.FC = () => {
  const { t } = useTranslation();
  useSeo(`${t('not_found_title')} — TownPulse`, t('not_found_desc'));

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-6 animate-rise">
        <div className="inline-flex bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/60 animate-float">
          <Compass className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <p className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-300 dark:to-indigo-300 gradient-text-flow animate-gradient-x">
            404
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('not_found_title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('not_found_desc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95"
          >
            <MapPin className="w-4 h-4" />
            {t('back_home')}
          </Link>
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            <MapIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {t('view_map')}
          </Link>
          <Link
            to="/submit"
            className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t('submit_listing')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
