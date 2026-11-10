import React, { useEffect, useRef, useState } from 'react';
import type { Listing } from '../services/api';

declare global {
  interface Window {
    google?: { maps?: any };
    gm_authFailure?: () => void;
  }
}

interface GoogleMapProps {
  apiKey: string;
  listings: Listing[];
  center: [number, number];
  zoom: number;
  selectedListingId?: string | null;
  selectedLocation?: [number, number] | null;
  onSelectListing?: (listing: Listing) => void;
  onMapClick?: (latitude: number, longitude: number) => void;
  onLoadError: () => void;
}

let mapsScriptPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    window.gm_authFailure = () => reject(new Error('Google Maps rejected this API key.'));
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.google?.maps ? resolve() : reject(new Error('Google Maps did not initialize.')));
    script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    mapsScriptPromise = null;
    throw error;
  });

  return mapsScriptPromise;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  listings,
  center,
  zoom,
  selectedListingId,
  selectedLocation,
  onSelectListing,
  onMapClick,
  onLoadError,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapClickRef = useRef(onMapClick);
  const listingSelectRef = useRef(onSelectListing);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    listingSelectRef.current = onSelectListing;
  }, [onSelectListing]);

  useEffect(() => {
    let active = true;
    loadGoogleMaps(apiKey)
      .then(() => active && setReady(true))
      .catch(() => active && onLoadError());
    return () => {
      active = false;
    };
  }, [apiKey, onLoadError]);

  useEffect(() => {
    if (!ready || !elementRef.current || !window.google?.maps) return;
    const googleMaps = window.google.maps;
    const map = new googleMaps.Map(elementRef.current, {
      center: { lat: center[0], lng: center[1] },
      zoom,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      draggableCursor: 'crosshair',
    });
    mapRef.current = map;
    const clickListener = map.addListener('click', (event: any) => {
      if (event.latLng) mapClickRef.current?.(event.latLng.lat(), event.latLng.lng());
    });

    return () => {
      clickListener.remove();
      googleMaps.event.clearInstanceListeners(map);
      mapRef.current = null;
    };
  }, [center[0], center[1], ready, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    map.setCenter({ lat: center[0], lng: center[1] });
    map.setZoom(zoom);
  }, [center[0], center[1], zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const googleMaps = window.google?.maps;
    if (!map || !googleMaps) return;

    const markers = listings
      .filter((listing) => listing.lat != null && listing.lng != null)
      .map((listing) => {
        const marker = new googleMaps.Marker({
          map,
          position: { lat: Number(listing.lat), lng: Number(listing.lng) },
          title: listing.name,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            scale: listing.id === selectedListingId ? 9 : 7,
            fillColor: listing.verified ? '#14543c' : '#9a3412',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => listingSelectRef.current?.(listing));
        return marker;
      });

    if (selectedLocation) {
      markers.push(
        new googleMaps.Marker({
          map,
          position: { lat: selectedLocation[0], lng: selectedLocation[1] },
          title: 'Selected search location',
          label: { text: 'You', color: '#ffffff', fontSize: '10px', fontWeight: '700' },
          zIndex: 1000,
        })
      );
    }

    const validLocations = listings.filter((listing) => listing.lat != null && listing.lng != null);
    if (selectedLocation) {
      validLocations.push({ lat: selectedLocation[0], lng: selectedLocation[1] } as Listing);
    }

    if (validLocations.length > 0) {
      if (validLocations.length === 1) {
        map.setCenter({ lat: Number(validLocations[0].lat), lng: Number(validLocations[0].lng) });
        map.setZoom(15);
      } else {
        const bounds = new googleMaps.LatLngBounds();
        validLocations.forEach((listing) => {
          if (listing.lat != null && listing.lng != null) {
            bounds.extend({ lat: Number(listing.lat), lng: Number(listing.lng) });
          }
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
      }
    }

    return () => markers.forEach((marker: any) => marker.setMap(null));
  }, [listings, selectedListingId, selectedLocation?.[0], selectedLocation?.[1]]);

  return <div ref={elementRef} className="h-full w-full" aria-label="Google map. Click to choose a search location." />;
};
