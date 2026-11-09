import React from 'react';
import { LoaderOne } from './ui/loader';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading local services...',
  className = 'py-16',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} aria-busy="true">
      <LoaderOne />
      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400" role="status">
        {message}
      </p>
    </div>
  );
};
