import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`tp-skeleton rounded-full ${className}`} aria-hidden="true" />
);

/**
 * Content-shaped skeleton used as the Suspense route fallback everywhere.
 *
 * AUDIT.md 1.3: the old fallback was a centred spinner, which tells a user
 * nothing about what is loading and reads as "broken". A shimmering copy of
 * the real layout keeps the page stable while data arrives and fades away the
 * instant the real content mounts.
 *
 * The .tp-skeleton rules live in src/styles/base.css (tp-shimmer, disabled by
 * prefers-reduced-motion).
 */
export const ScreenSkeleton: React.FC = () => (
  <div
    className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 dark:bg-slate-950"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Loading page content"
  >
    <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-20 dark:opacity-10" aria-hidden="true" />

    <div className="relative mx-auto max-w-7xl animate-fade-in" aria-hidden="true">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xs backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SkeletonBar className="h-2.5 w-16 bg-slate-200 dark:bg-slate-700" />
            <SkeletonBar className="h-2.5 w-24 bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="mb-5 space-y-3">
            <SkeletonBar className="h-3 w-28 bg-slate-200 dark:bg-slate-700" />
            <SkeletonBar className="h-7 w-52 bg-slate-200 dark:bg-slate-700" />
            <SkeletonBar className="h-4 w-72 bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonBar className="h-12 w-full bg-slate-200 dark:bg-slate-700" />
            <SkeletonBar className="h-12 w-full sm:w-28 bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <SkeletonBar
              key={`chip-${index}`}
              className="h-8 w-20 bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`card-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <SkeletonBar className="h-4 w-16 bg-slate-200 dark:bg-slate-700" />
                <SkeletonBar className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>

              <SkeletonBar className="mb-3 h-5 w-32 bg-slate-200 dark:bg-slate-700" />

              <div className="space-y-2">
                <SkeletonBar className="h-3 w-full bg-slate-200 dark:bg-slate-700" />
                <SkeletonBar className="h-3 w-5/6 bg-slate-200 dark:bg-slate-700" />
                <SkeletonBar className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="mt-4 flex gap-2">
                <SkeletonBar className="h-8 w-20 bg-slate-200 dark:bg-slate-700" />
                <SkeletonBar className="h-8 flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <SkeletonBar className="h-3 w-24 bg-slate-200 dark:bg-slate-700" />
          <SkeletonBar className="h-9 w-28 bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  </div>
);

export default ScreenSkeleton;
