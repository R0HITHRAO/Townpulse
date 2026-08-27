import React, { useState } from 'react';
import { Search, Navigation, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  onSearch: (params: { q: string; radius?: number; lat?: number; lng?: number }) => void;
  initialQuery?: string;
  initialRadius?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  initialQuery = '',
  initialRadius = 10000,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [radius, setRadius] = useState(initialRadius);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocating(false);
        onSearch({ q: query, radius, lat: coords.lat, lng: coords.lng });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
        alert('Could not determine your location. Please enter your search term or address.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      q: query,
      radius,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-gray-200/90 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/50">
        {/* Search Keyword Input */}
        <div className="flex-1 flex items-center gap-3 px-3 py-2 w-full">
          <Search className="w-5 h-5 text-gray-400 dark:text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none"
            aria-label="Search local services"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          {/* Radius Selector */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-semibold text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer py-1"
              aria-label="Filter search radius"
            >
              <option value={5000} className="dark:bg-slate-900">5 km</option>
              <option value={10000} className="dark:bg-slate-900">10 km</option>
              <option value={25000} className="dark:bg-slate-900">25 km</option>
              <option value={50000} className="dark:bg-slate-900">50 km</option>
            </select>
          </div>

          {/* Current Location Geolocation Trigger */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locating}
            className={`p-2 rounded-xl border transition flex items-center gap-1 text-xs font-medium hover:scale-105 active:scale-95 ${
              userLocation
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'
            }`}
            title="Use My Current Location"
            aria-label="Use My Current Location"
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden md:inline">{userLocation ? 'Near Me' : 'Locate'}</span>
          </button>

          {/* Search Button */}
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>
    </form>
  );
};
