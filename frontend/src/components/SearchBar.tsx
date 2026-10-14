import React, { useState } from 'react';
import { Search, Navigation, SlidersHorizontal, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  onSearch: (params: { q: string; radius?: number; lat?: number; lng?: number; openOnly?: boolean }) => void;
  initialQuery?: string;
  initialRadius?: number;
  initialOpenOnly?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  initialQuery = '',
  initialRadius = 10000,
  initialOpenOnly = false,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [radius, setRadius] = useState(initialRadius);
  const [openOnly, setOpenOnly] = useState(initialOpenOnly);
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
        onSearch({ q: query, radius, lat: coords.lat, lng: coords.lng, openOnly });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
        alert('Could not determine your location. Please enter your search term or address.');
      },
      { timeout: 10000 }
    );
  };

  const handleToggleOpenOnly = () => {
    const next = !openOnly;
    setOpenOnly(next);
    onSearch({
      q: query,
      radius,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      openOnly: next,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      q: query,
      radius,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      openOnly,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#e8ddce] bg-[#fffdfa] p-2 shadow-[0_12px_32px_rgba(33,24,17,0.16)] transition-shadow duration-200 focus-within:ring-2 focus-within:ring-orange-400/50 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:rounded-[1.15rem]">
        {/* Search Keyword Input */}
        <div className="group/field flex-1 flex items-center gap-3 px-3 py-2 w-full">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-all duration-300 ease-fluid group-focus-within/field:text-orange-600 dark:group-focus-within/field:text-orange-400 group-focus-within/field:scale-110" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none"
            aria-label="Search local services"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          {/* Open Now Toggle Button */}
          <button
            type="button"
            onClick={handleToggleOpenOnly}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              openOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Filter services open right now"
            aria-label="Toggle Open Now filter"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Open Now</span>
          </button>

          {/* Radius Selector */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer py-1"
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
            className={`inline-flex min-h-10 items-center gap-1 rounded-xl border p-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              userLocation
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
            title="Use My Current Location"
            aria-label="Use My Current Location"
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin text-orange-500' : ''}`} />
            <span className="hidden md:inline">{userLocation ? 'Near Me' : 'Locate'}</span>
          </button>

          {/* Search Button */}
          <button
            type="submit"
            className="group/search inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#9a3412] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#7c2a0d] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:w-auto motion-reduce:transition-none"
          >
            <Search className="w-4 h-4 transition-transform duration-300 ease-fluid group-hover/search:scale-110 group-hover/search:-rotate-6" />
            <span>Search</span>
          </button>
        </div>
      </div>
    </form>
  );
};
