import React from 'react';
import { getOpenStatus } from '../utils/businessHours';

interface OpenStatusBadgeProps {
  hours?: Record<string, string> | null;
  size?: 'sm' | 'md';
}

export const OpenStatusBadge: React.FC<OpenStatusBadgeProps> = ({ hours, size = 'sm' }) => {
  const status = getOpenStatus(hours);

  const isSmall = size === 'sm';

  if (status.isOpen) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full border transition-all ${
          isSmall ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
        } bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 shadow-2xs`}
        title={status.statusText}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Open Now</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
        isSmall ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80`}
      title={status.statusText}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
      <span>Closed</span>
    </span>
  );
};
