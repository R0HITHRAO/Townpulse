import React from 'react';
import { Loader2 } from 'lucide-react';

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
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-xs sm:text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
};
