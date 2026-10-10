import React from 'react';

/**
 * Content-shaped skeleton used as the Suspense route fallback everywhere.
 *
 * AUDIT.md 1.3: the old fallback was a centred spinner, which tells a user
 * nothing about what is loading and reads as "broken". A shimmering copy of
 * the real layout (the directory grid + title) lets the page breathe while
 * data arrives, and it vanishes the instant real content mounts.
 *
 * The .tp-skeleton rules live in src/styles/base.css (tp-shimmer, disabled by
 * prefers-reduced-motion).
 */
export const ScreenSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 dark:bg-slate-950">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded tp-skeleton" />
        <div className="h-6 w-36 rounded tp-skeleton" />
        <div className="h-4 w-40 rounded tp-skeleton" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 tp-skeleton"
          >
            <div className="mb-3 h-4 w-20 rounded tp-skeleton" />
            <div className="mb-2 h-5 w-32 rounded tp-skeleton" />
            <div className="mb-2 h-4 w-full rounded tp-skeleton" />
            <div className="h-4 w-2/3 rounded tp-skeleton" />
          </div>
        ))}
      </div>

      <div className="h-4 w-28 rounded tp-skeleton" />
    </div>
  </div>
);

export default ScreenSkeleton;
