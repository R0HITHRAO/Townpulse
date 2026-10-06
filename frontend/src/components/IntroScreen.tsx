import React, { useState, useEffect } from 'react';

interface IntroScreenProps {
  onEnter: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnter }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading of flagship assets
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setLoading(false);
          return 100;
        }
        return p + 5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      {/* Background abstract element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/20 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-[0.2em] mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
          TownPulse
        </h1>

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-orange-500 transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs uppercase tracking-widest text-white/50">Loading Experience {progress}%</p>
          </div>
        ) : (
          <div className="perspective-1000 mt-12">
            <button
              onClick={onEnter}
              className="group relative px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/30 text-white font-bold uppercase tracking-[0.3em] text-sm rounded-full overflow-hidden transition-all duration-500 hover:scale-110 hover:-rotate-y-12 hover:rotate-x-12 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] hover:bg-white/20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]" />
              <span className="relative z-10 group-hover:text-white transition-colors duration-500 flex items-center gap-4 drop-shadow-md">
                Enter 3D Webpage
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
