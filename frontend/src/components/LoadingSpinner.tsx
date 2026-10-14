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
      <div className="relative flex h-10 w-10 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-600 border-r-orange-400 dark:border-t-orange-400 dark:border-r-orange-300 animate-spin" />
        <span className="absolute inset-[13px] rounded-full bg-orange-600 dark:bg-orange-400" />
      </div>

      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400" role="status">
        {message}
      </p>
    </div>
  );
};
