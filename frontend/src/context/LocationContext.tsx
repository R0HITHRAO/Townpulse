/**
 * Location context
 * ================
 * The app no longer ships a hardcoded town: it now works around whatever place
 * the user is (or chooses). The provider resolves the user's current position
 * once on load (geolocation, with a short timeout) and exposes it to the whole
 * tree. When location is not available, denied or blocked, the UI falls back to
 * an explicit "choose your location" form (geolocate button + lat/lng fields).
 *
 * Nothing in this module assumes a town: there is no Hampi, no Bengaluru, no
 * other default. Every map, search and radius origin is driven by `location`,
 * which starts out `null` until the user says where they are.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** A user-resolved position: name is a friendly label, coords are exact. */
export interface Location {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

export function isLocation(value: unknown): value is Location {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === 'string' &&
    typeof v.region === 'string' &&
    typeof v.country === 'string' &&
    typeof v.lat === 'number' &&
    typeof v.lng === 'number'
  );
}

interface LocationContextValue {
  location: Location | null;
  isLocating: boolean;
  error: string | null;
  /** Resolve the current position via the browser. Safe in tests (no-op). */
  requestLocation: () => Promise<void>;
  /** Set the chosen position (used by the manual form below the map). */
  setLocation: (location: Location) => void;
  /** Clear the chosen position so the map/picker resets. */
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// Detect once; `navigator` is undefined during Node-based prerendering, which
// would throw at module level.
let geoSupported = false;
try {
  geoSupported = !!(navigator.geolocation && 'geolocation' in navigator);
} catch {
  geoSupported = false;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    if (!geoSupported) {
      setError(
        'Your browser does not support location services. Pick a place below instead.'
      );
      return;
    }
    setIsLocating(true);
    setError(null);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
          });
        }
      );
      const { latitude: lat, longitude: lng } = position.coords;
      setLocationState({
        name: 'Your location',
        region: '',
        country: '',
        lat,
        lng,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not access your location.';
      setError(message);
      setLocationState(null);
    } finally {
      setIsLocating(false);
    }
  };

  // Resolve the user's current location as soon as the app mounts.
  useEffect(() => {
    void requestLocation();
  }, []);

  const value: LocationContextValue = {
    location,
    isLocating,
    error,
    requestLocation,
    setLocation: setLocationState,
    clearLocation: () => setLocationState(null),
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useCurrentLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useCurrentLocation must be used inside a LocationProvider');
  }
  return ctx;
}
