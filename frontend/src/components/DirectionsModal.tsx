import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Listing } from '../services/api';
import {
  getRoute,
  RouteResult,
  TravelMode,
  formatDistance,
  formatDuration,
  getGoogleMapsNavigationUrl,
  getAppleMapsNavigationUrl,
} from '../services/routing';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Navigation,
  Car,
  Footprints,
  Bike,
  ExternalLink,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
} from 'lucide-react';

interface DirectionsModalProps {
  listing: Listing;
  onClose: () => void;
}

// Custom map markers for start and destination
const startIcon = L.divIcon({
  className: 'custom-leaflet-div-icon',
  html: `
    <div style="background-color: #10b981; color: white; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; font-weight: bold; font-size: 13px;">
      A
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const endIcon = L.divIcon({
  className: 'custom-leaflet-div-icon',
  html: `
    <div style="background-color: #ef4444; color: white; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; font-weight: bold; font-size: 13px;">
      B
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const DirectionsModal: React.FC<DirectionsModalProps> = ({ listing, onClose }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [mode, setMode] = useState<TravelMode>('driving');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const destLat = Number(listing.lat);
  const destLng = Number(listing.lng);

  // Auto request location on modal open
  useEffect(() => {
    requestUserLocation();
  }, []);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      // Use fallback town center nearby (offset slightly)
      setUserLocation({
        lat: destLat - 0.015,
        lng: destLng - 0.012,
      });
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocationError('Could not access GPS. Using local neighborhood starting point.');
        // Default starting point ~1.8km away
        setUserLocation({
          lat: destLat - 0.012,
          lng: destLng - 0.015,
        });
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Recalculate route when start, destination, or travel mode changes
  useEffect(() => {
    if (!userLocation || isNaN(destLat) || isNaN(destLng)) return;

    setIsLoadingRoute(true);
    getRoute(userLocation, { lat: destLat, lng: destLng }, mode)
      .then((res) => {
        setRouteResult(res);
      })
      .catch((err) => {
        console.error('Route calculation error:', err);
      })
      .finally(() => setIsLoadingRoute(false));
  }, [userLocation, destLat, destLng, mode]);

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const mapBounds = userLocation && !isNaN(destLat)
    ? L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [destLat, destLng],
      ]).pad(0.2)
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="directions-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 id="directions-title" className="text-base font-bold text-slate-900 dark:text-white">
                Directions to {listing.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                {listing.address}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close directions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Travel Mode Selector */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setMode('driving')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                mode === 'driving'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive</span>
            </button>
            <button
              onClick={() => setMode('walking')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                mode === 'walking'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>
            <button
              onClick={() => setMode('cycling')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                mode === 'cycling'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Cycle</span>
            </button>
          </div>

          <button
            onClick={requestUserLocation}
            disabled={isLocating}
            className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1.5 hover:underline disabled:opacity-50"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring GPS...' : 'Update My GPS'}</span>
          </button>
        </div>

        {/* Route Summary Metric Bar */}
        {routeResult && (
          <div className="px-6 py-2.5 bg-orange-50/70 dark:bg-orange-950/40 border-b border-orange-100 dark:border-orange-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-orange-700 dark:text-orange-300">
                <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>{formatDuration(routeResult.durationSeconds)}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDistance(routeResult.distanceMeters)}</span>
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Fastest Local Path</span>
            </span>
          </div>
        )}

        {locationError && (
          <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Content Body: Map + Step by Step */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Interactive Mini Route Map */}
          <div className="h-[220px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
            {userLocation && (
              <MapContainer
                bounds={mapBounds}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  key={isDark ? 'dark-tiles' : 'light-tiles'}
                  url={tileUrl}
                  className={isDark ? 'dark-map-tiles' : ''}
                />
                <Marker position={[userLocation.lat, userLocation.lng]} icon={startIcon}>
                  <Popup>Your Location</Popup>
                </Marker>
                <Marker position={[destLat, destLng]} icon={endIcon}>
                  <Popup>{listing.name}</Popup>
                </Marker>
                {routeResult && (
                  <Polyline
                    positions={routeResult.coordinates}
                    pathOptions={{
                      color: isDark ? '#60a5fa' : '#2563eb',
                      weight: 5,
                      opacity: 0.85,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                )}
              </MapContainer>
            )}
            {isLoadingRoute && (
              <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[1000]">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Calculating fastest route...</span>
                </div>
              </div>
            )}
          </div>

          {/* Turn-by-Turn Steps */}
          {routeResult && routeResult.steps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Route Instructions
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {routeResult.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between text-xs gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {step.instruction}
                      </span>
                    </div>
                    {step.distanceMeters > 0 && (
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                        {formatDistance(step.distanceMeters)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Powered by OpenStreetMap & OSRM (Zero API Cost)
          </div>
          <div className="flex items-center gap-2">
            <a
              href={getGoogleMapsNavigationUrl(
                destLat,
                destLng,
                userLocation?.lat,
                userLocation?.lng
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={getAppleMapsNavigationUrl(destLat, destLng)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Apple Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
