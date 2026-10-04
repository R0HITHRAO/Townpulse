import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { getOpenStatus } from '../utils/businessHours';

interface OpenStatusBadgeProps {
  hours?: Record<string, string> | null;
  size?: 'sm' | 'md';
}

export const OpenStatusBadge: React.FC<OpenStatusBadgeProps> = ({ hours, size = 'sm' }) => {
  const { t } = useTranslation();
  const status = getOpenStatus(hours);
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  if (status.state === 'open') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full border transition-all ${sizeClass} bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 shadow-2xs`}
        title={status.statusText}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>{t('listing.open', { defaultValue: 'Open now' })}</span>
      </span>
    );
  }

  if (status.state === 'closed') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border ${sizeClass} bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80`}
        title={status.statusText}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        <span>{t('listing.closed', { defaultValue: 'Closed' })}</span>
      </span>
    );
  }

  // Unknown: hours were never recorded, or could not be read. Rendering this
  // as "Open Now" is the defect AUDIT.md 4.4 records — someone may travel on it.
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${sizeClass} bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700`}
      title={status.statusText}
    >
      <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
      <span>{t('listing.hoursUnknown', { defaultValue: 'Hours not confirmed' })}</span>
    </span>
  );
};
