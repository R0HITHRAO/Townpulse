import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';

/**
 * Shown when the app is rendering the bundled offline snapshot because the API
 * could not be reached.
 *
 * This exists because the previous behaviour — failing to load and showing
 * "Could not load services" with no content — was the worst possible outcome
 * for a site meant to help someone find a clinic or a mechanic in a hurry.
 * Showing real OpenStreetMap data with a clear caveat is strictly more useful
 * than showing nothing, and the caveat keeps it honest.
 */
interface OfflineDataBannerProps {
  onRetry?: () => void;
  className?: string;
}

export const OfflineDataBanner: React.FC<OfflineDataBannerProps> = ({
  onRetry,
  className = '',
}) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/60 dark:text-amber-200 ${className}`}
  >
    <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
    <p className="min-w-0 flex-1 leading-relaxed">
      <strong className="font-semibold">Showing saved directory data.</strong>{' '}
      The TownPulse server is not reachable, so these are the last records saved
      with this site. Nothing here is marked verified — confirm by phone before
      you travel.
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try the live server
      </button>
    )}
  </div>
);

export default OfflineDataBanner;