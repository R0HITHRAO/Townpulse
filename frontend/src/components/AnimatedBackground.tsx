import React from 'react';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-300">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-20" />

      <div
        className="absolute -inset-x-1/4 -top-1/4 h-[80vh] blur-3xl opacity-25"
        style={{
          background:
            'conic-gradient(from 120deg at 50% 50%, rgba(191, 219, 254, 0.45), rgba(221, 214, 254, 0.4), rgba(167, 243, 208, 0.35), rgba(191, 219, 254, 0.45))',
        }}
      />

      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/20 sm:h-[500px] sm:w-[500px]" />
      <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-500/15 sm:h-[550px] sm:w-[550px]" />
      <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/15 sm:h-[600px] sm:w-[600px]" />
    </div>
  );
};
