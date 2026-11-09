import React from 'react';
import { LoaderOne } from './ui/loader';

/**
 * Suspense fallback using the shared Loader One animation. The previous
 * content-shaped skeleton ran a separate shimmer animation from the page
 * loading indicators.
 */
export const ScreenSkeleton: React.FC = () => (
  <div
    className="flex min-h-[60vh] items-center justify-center bg-slate-50 dark:bg-slate-950"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Loading page content"
  >
    <LoaderOne />
  </div>
);

export default ScreenSkeleton;
