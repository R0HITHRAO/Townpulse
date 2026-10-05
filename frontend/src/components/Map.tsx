import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Listing } from '../services/api';
import { Phone, CheckCircle2, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OpenStatusBadge } from './OpenStatusBadge';
import { town } from '../config/site';
// Leaflet's stylesheet is bundled from node_modules instead of being fetched
// from unpkg.com in index.html. A render-blocking third-party request meant a
// slow or blocked CDN produced a completely unstyled, unusable map.
import '../styles/leaflet.css';
// Resolved by Vite from node_modules, so Leaflet's own stylesheet ships with
// the bundle instead of being fetched from a CDN at runtime.
import 'leaflet/dist/leaflet.css';

function createCustomPin(listing: Listing, isSelected: boolean): L.DivIcon {
  const glyph = document.createElement('span');
  glyph.textContent = listing.category?.icon || '•';

  const badge = document.createElement('span');
  badge.className = `townpulse-pin-badge${isSelected ? ' is-selected' : ''}`;
  badge.setAttribute('aria-hidden', 'true');
  badge.append(glyph);

  return L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: badge,
    iconSize: [42, 48],
    iconAnchor: [21, 43],
    popupAnchor: [0, -42],
  });
}

function getListingCoordinates(listing: Listing): [number, number] | null {
  if (listing.lat == null || listing.lng == null) return null;

  const latitude = Number(listing.lat);
  const longitude = Number(listing.lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

const WheelZoomBehavior: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (enabled) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [enabled, map]);

  return null;
};

interface MapProps {
  listings: Listing[];
  /** Defaults to the configured town centre, never a hardcoded city. */
  center?: [number, number];
  zoom?: number;
  selectedListingId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  className?: string;
  autoFitBounds?: boolean;
  /** Zoom used when there is exactly one pin to frame. */
  singleMarkerZoom?: number;
  /** Disable wheel zoom on embedded maps so page scrolling remains natural. */
  scrollWheelZoom?: boolean;
}

// Auto Fit Bounds to all markers with comfortable margin
const AutoFitBounds: React.FC<{
  listings: Listing[];
  enabled?: boolean;
  singleZoom?: number;
}> = ({ listings, enabled = true, singleZoom = 15 }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || listings.length === 0) return;

    const validCoords = listings
      .map(getListingCoordinates)
      .filter((coords): coords is [number, number] => coords !== null);

    if (validCoords.length === 0) return;

    if (validCoords.length === 1) {
      map.setView(validCoords[0], singleZoom, { animate: true });
    } else {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }
    // `map` is stable across renders; including it caused the map to re-fit
    // and fight with user panning.
  }, [listings, enabled, singleZoom]);

  return null;
};

// Recenter Map when selectedListingId changes
const FocusSelectedListing: React.FC<{
  listings: Listing[];
  selectedListingId?: string | null;
}> = ({ listings, selectedListingId }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedListingId) return;
    const target = listings.find((l) => l.id === selectedListingId);
    const coordinates = target ? getListingCoordinates(target) : null;
    if (coordinates) {
      map.flyTo(coordinates, 15, { duration: 1.0 });
    }
  }, [selectedListingId, listings, map]);

  return null;
};

export const Map: React.FC<MapProps> = ({
  listings,
  center,
  zoom,
  selectedListingId,
  onSelectListing,
  className = 'h-[280px] w-full',
  autoFitBounds = true,
  singleMarkerZoom = 15,
  scrollWheelZoom = false,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [tileProvider, setTileProvider] = useState<'carto' | 'osm'>('carto');
  const [tilesUnavailable, setTilesUnavailable] = useState(false);

  // Default to the configured town. The previous hardcoded default was
  // Bengaluru (12.9716, 77.5946), so every map opened on the wrong city and
  // showed no pins at all.
  const mapCenter: [number, number] = center ?? [town.lat, town.lng];
  const mapZoom = zoom ?? town.zoom;

  useEffect(() => {
    setTileProvider('carto');
    setTilesUnavailable(false);
  }, [isDark]);

  const tileUrl =
    tileProvider === 'carto'
      ? isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution =
    tileProvider === 'carto'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const listingsWithCoordinates = listings
    .map((listing) => ({
      listing,
      coordinates: getListingCoordinates(listing),
    }))
    .filter(
      (entry): entry is { listing: Listing; coordinates: [number, number] } =>
        entry.coordinates !== null
    );

  return (
    <div
      className={`relative z-10 overflow-hidden rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface-2)] shadow-[var(--tp-shadow-sm)] ${className}`}
    >
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full bg-[var(--tp-surface-2)]"
      >
        <TileLayer
          key={`${tileProvider}-${isDark ? 'dark' : 'light'}`}
          attribution={attribution}
          url={tileUrl}
          maxZoom={20}
          maxNativeZoom={20}
          eventHandlers={{
            tileerror: () => {
              if (tileProvider === 'carto') setTileProvider('osm');
              else setTilesUnavailable(true);
            },
          }}
        />

        <AutoFitBounds listings={listings} enabled={autoFitBounds} singleZoom={singleMarkerZoom} />
        <FocusSelectedListing listings={listings} selectedListingId={selectedListingId} />
        <WheelZoomBehavior enabled={scrollWheelZoom} />

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={48}
          iconCreateFunction={(cluster) => {
            const count = document.createElement('span');
            count.textContent = String(cluster.getChildCount());
            return L.divIcon({
              className: 'tp-map-cluster',
              html: count,
              iconSize: [44, 44],
            });
          }}
        >
          {listingsWithCoordinates.map(({ listing: l, coordinates }) => {
            const isSelected = selectedListingId === l.id;
            const pinIcon = createCustomPin(l, isSelected);

            return (
              <Marker
                key={l.id}
                position={coordinates}
                icon={pinIcon}
                eventHandlers={{
                  click: () => onSelectListing?.(l),
                }}
              >
                <Popup>
                  <div className="tp-map-popup">
                    {l.image_url && (
                      <div className="tp-map-popup__image">
                        <img
                          src={l.image_url}
                          alt={l.name}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="tp-map-popup__heading">
                      <Link to={`/listings/${l.id}`} className="tp-map-popup__title">
                        {l.name}
                      </Link>
                      {l.verified && (
                        <CheckCircle2
                          aria-label="Verified listing"
                          className="h-4 w-4 shrink-0 text-[var(--tp-accent)]"
                        />
                      )}
                    </div>
                    <div className="tp-map-popup__metadata">
                      <OpenStatusBadge hours={l.hours} size="sm" />
                      {l.category && (
                        <span className="tp-map-popup__category">{l.category.name}</span>
                      )}
                    </div>
                    {l.average_rating ? (
                      <div className="tp-map-popup__rating">
                        <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                        <span>{l.average_rating.toFixed(1)}</span>
                        <span className="tp-map-popup__reviews">({l.review_count})</span>
                      </div>
                    ) : null}
                    <p className="tp-map-popup__address">{l.address}</p>
                    <div className="tp-map-popup__actions">
                      {l.phone ? (
                        <a href={`tel:${l.phone}`} className="tp-map-popup__call">
                          <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                          Call
                        </a>
                      ) : (
                        <span />
                      )}
                      <Link to={`/listings/${l.id}`} className="tp-map-popup__details">
                        View details <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      {tilesUnavailable && (
        <div
          role="status"
          className="absolute bottom-8 left-3 z-[1000] max-w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)]/95 px-3 py-2 text-xs text-[var(--tp-text-muted)] shadow-[var(--tp-shadow-md)]"
        >
          Map tiles are unavailable right now. Place markers remain available.
        </div>
      )}
    </div>
  );
};
