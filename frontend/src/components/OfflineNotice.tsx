import React, { useState, useEffect } from 'react';
import { WifiOff, PhoneCall, ShieldAlert, X } from 'lucide-react';

export const OfflineNotice: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  const emergencyContacts = [
    { title: 'National Emergency', phone: '112', icon: '🚨' },
    { title: 'Ambulance & Medical', phone: '108', icon: '🚑' },
    { title: 'Police Helpline', phone: '100', icon: '👮' },
    { title: 'Fire Control Room', phone: '101', icon: '🚒' },
    { title: 'Disaster Relief Helpline', phone: '1070', icon: '🌊' },
    { title: 'Women & Child Helpline', phone: '1091', icon: '🛡️' },
  ];

  return (
    <>
      {/* Offline Alert Strip */}
      <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50 sticky top-0 animate-fade-in">
        <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span>
            <strong>Offline Disaster Mode:</strong> You are currently offline. You can still view cached listings and emergency numbers.
          </span>
        </div>

        <button
          onClick={() => setShowDrawer(true)}
          className="bg-black/20 hover:bg-black/30 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition ml-2"
        >
          <PhoneCall className="w-3 h-3" />
          <span>Offline Helpline</span>
        </button>
      </div>

      {/* Offline Emergency Directory Modal */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-amber-500 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Offline Emergency Directory
                </h3>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Direct emergency helpline numbers stored offline on your device for immediate cellular calling during disaster outages.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {emergencyContacts.map((contact) => (
                <a
                  key={contact.phone}
                  href={`tel:${contact.phone}`}
                  className="p-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-2xl border border-amber-200 dark:border-amber-800/80 flex items-center justify-between transition hover:scale-105"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{contact.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{contact.title}</div>
                      <div className="text-xs font-mono font-extrabold text-amber-700 dark:text-amber-400">
                        {contact.phone}
                      </div>
                    </div>
                  </div>
                  <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </a>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowDrawer(false)}
                className="w-full py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
              >
                Close Helpline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
