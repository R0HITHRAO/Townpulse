import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading local services...',
  className = 'py-16',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Orbiting ring with a soft pulsing halo and breathing core */}
      <div className="relative w-10 h-10" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-600 border-r-orange-400 dark:border-t-orange-400 dark:border-r-orange-300 animate-spin" />
        <span className="absolute inset-0 rounded-full bg-orange-500/20 dark:bg-orange-400/20 animate-ping-soft" />
        <span className="absolute inset-[13px] rounded-full bg-orange-600 dark:bg-orange-400 animate-pulse" />
      </div>

      {/* Travelling dots for a fluid "in progress" cue */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-orange-400 animate-dot-bounce"
            style={{ animationDelay: `${index * 140}ms` }}
          />
        ))}
      </div>

      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400" role="status">
        {message}
      </p>
    </div>
  );
};
