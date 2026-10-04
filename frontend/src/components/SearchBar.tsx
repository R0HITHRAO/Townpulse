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
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-2 shadow-[var(--tp-shadow-lg)] transition-all duration-200 focus-within:border-[var(--tp-border-focus)] focus-within:ring-2 focus-within:ring-[var(--tp-primary)]/15 sm:flex-row sm:items-center">
        {/* Search Keyword Input */}
        <div className="group/field flex min-h-12 w-full flex-1 items-center gap-3 px-3 sm:min-h-14">
          <Search aria-hidden="true" className="h-5 w-5 flex-shrink-0 text-[var(--tp-text-subtle)] transition-colors group-focus-within/field:text-[var(--tp-primary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full border-none bg-transparent text-base text-[var(--tp-text)] placeholder:text-[var(--tp-text-subtle)] focus:outline-none"
            aria-label="Search local services"
          />
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-[var(--tp-border)] pt-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
          {/* Open Now Toggle Button */}
          <button
            type="button"
            onClick={handleToggleOpenOnly}
            aria-pressed={openOnly}
            className={`flex min-h-11 items-center gap-1 rounded-xl border px-3 text-xs font-semibold transition-all ${
              openOnly
                ? 'border-[var(--tp-accent)] bg-[var(--tp-accent-soft)] text-[var(--tp-accent-soft-text)]'
                : 'border-[var(--tp-border)] text-[var(--tp-text-muted)] hover:bg-[var(--tp-surface-2)]'
            }`}
            title="Filter services open right now"
            aria-label="Toggle Open Now filter"
          >
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Open Now</span>
          </button>

          {/* Radius Selector */}
          <label className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs text-[var(--tp-text-muted)]">
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="cursor-pointer border-none bg-transparent py-1 text-xs font-semibold text-[var(--tp-text)] focus:outline-none"
              aria-label="Filter search radius"
            >
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km</option>
              <option value={50000}>50 km</option>
            </select>
          </label>

          {/* Current Location Geolocation Trigger */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locating}
            className={`flex min-h-11 items-center gap-1 rounded-xl border px-3 text-xs font-medium transition ${
              userLocation
                ? 'border-[var(--tp-accent)] bg-[var(--tp-accent-soft)] text-[var(--tp-accent-soft-text)]'
                : 'border-[var(--tp-border)] text-[var(--tp-text-muted)] hover:bg-[var(--tp-surface-2)]'
            }`}
            title="Use My Current Location"
            aria-label="Use My Current Location"
          >
            <Navigation aria-hidden="true" className={`h-4 w-4 ${locating ? 'animate-spin text-[var(--tp-primary)]' : ''}`} />
            <span className="hidden md:inline">{userLocation ? 'Near Me' : 'Locate'}</span>
          </button>

          {/* Search Button */}
          <button
            type="submit"
            className="tp-btn tp-btn-primary min-h-11 flex-1 rounded-xl px-5 text-sm sm:flex-none"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            <span>Search</span>
          </button>
        </div>
      </div>
    </form>
  );
};
