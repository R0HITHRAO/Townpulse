import React, { useState, useEffect } from 'react';
import { api, EmergencyAlert } from '../services/api';
import { AlertTriangle, AlertCircle, Info, X, ExternalLink } from 'lucide-react';

export const EmergencyAlertBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('townpulse_dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api
      .getActiveAlerts()
      .then((res) => {
        setAlerts(res || []);
      })
      .catch((err) => {
        console.warn('Failed to load active emergency alerts:', err);
      });
  }, []);

  const handleDismiss = (id: string) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    sessionStorage.setItem('townpulse_dismissed_alerts', JSON.stringify(next));
  };

  const visibleAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="w-full z-40 space-y-1">
      {visibleAlerts.map((alert) => {
        const severityStyles = {
          critical: 'bg-rose-600 text-white border-rose-700',
          warning: 'bg-amber-500 text-slate-950 border-amber-600',
          info: 'bg-blue-600 text-white border-blue-700',
        };

        const Icon =
          alert.severity === 'critical'
            ? AlertTriangle
            : alert.severity === 'warning'
            ? AlertCircle
            : Info;

        return (
          <div
            key={alert.id}
            className={`px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium border-b shadow-sm animate-fade-in ${
              severityStyles[alert.severity] || severityStyles.warning
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2.5 max-w-5xl mx-auto flex-1">
              <Icon className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-bold uppercase tracking-wider text-[11px] bg-black/20 px-1.5 py-0.5 rounded">
                  {alert.severity}
                </span>
                <strong className="font-bold">{alert.title}:</strong>
                <span>{alert.message}</span>
                {alert.link_url && (
                  <a
                    href={alert.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline font-bold ml-1 hover:opacity-80"
                  >
                    <span>More details</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(alert.id)}
              className="p-1 rounded-md hover:bg-black/20 transition flex-shrink-0 ml-2"
              title="Dismiss announcement"
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
