import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Listing } from '../services/api';
import { Phone, CheckCircle2, Star } from 'lucide-react';
import { OpenStatusBadge } from './OpenStatusBadge';
import { town } from '../config/site';
// Leaflet's stylesheet is bundled from node_modules instead of being fetched
// from unpkg.com in index.html. A render-blocking third-party request meant a
// slow or blocked CDN produced a completely unstyled, unusable map.
import '../styles/leaflet.css';
// Resolved by Vite from node_modules, so Leaflet's own stylesheet ships with
// the bundle instead of being fetched from a CDN at runtime.
import 'leaflet/dist/leaflet.css';

// Fix default leaflet marker icon issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Category colors for vibrant badges
const categoryColors: Record<string, string> = {
  'Healthcare & Clinics': '#ef4444',
  'Food & Groceries': '#10b981',
  'Auto & Mechanics': '#3b82f6',
  'Cafes & Dining': '#f59e0b',
  'Shelters & Emergency': '#dc2626',
  'Community & Volunteers': '#8b5cf6',
  'Education & Libraries': '#06b6d4',
  'Home Services & Plumbers': '#6366f1',
  'Public Services & Civic': '#0ea5e9',
};

/**
 * Creates custom circular badge pin for each listing (Zero API needed)
 */
function createCustomPin(listing: Listing, isSelected: boolean): L.DivIcon {
  const iconChar = listing.category?.icon || '📍';
  const categoryName = listing.category?.name || '';
  const borderColor = categoryColors[categoryName] || '#ea580c';

  // The accent is passed as a custom property, not `border-color`, so the
  // stylesheet owns the border width and style and this only supplies a colour.
  const html = `
    <div class="townpulse-pin-badge ${isSelected ? 'selected' : ''}" style="--tp-pin-accent: ${borderColor};">
      <span>${iconChar}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: html,
    iconSize: [34, 40],
    iconAnchor: [17, 40],
    popupAnchor: [0, -38],
  });
}

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
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => [Number(l.lat), Number(l.lng)] as [number, number]);

    if (validCoords.length === 0) return;

    if (validCoords.length === 1) {
      map.setView(validCoords[0], singleZoom, { animate: true });
    } else {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }
    // `map` is stable across renders; including it caused the map to re-fit and
    // fight with user panning.
  }, [listings, enabled, singleZoom]);

  return null;
};

// Recenter Map when selectedListingId changes
const FocusSelectedListing: React.FC<{ listings: Listing[]; selectedListingId?: string | null }> = ({
  listings,
  selectedListingId,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedListingId) return;
    const target = listings.find((l) => l.id === selectedListingId);
    if (target && target.lat != null && target.lng != null) {
      map.flyTo([Number(target.lat), Number(target.lng)], 15, { duration: 1.0 });
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
}) => {
  // Default to the configured town. The previous hardcoded default was
  // Bengaluru (12.9716, 77.5946), so every map opened on the wrong city and
  // showed no pins at all.
  const mapCenter: [number, number] = center ?? [town.lat, town.lng];
  const mapZoom = zoom ?? town.zoom;

  // 100% Free, Zero-API-Key OpenStreetMap Standard Tile Layer
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    // `data-lenis-prevent` opts this subtree out of Lenis smooth scrolling:
    // without it, wheel events over the map are swallowed by the page-level
    // smooth scroller and Leaflet never zooms.
    <div
      data-lenis-prevent
      className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative z-10 ${className}`}
    >
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          // No `key` on theme change: dark mode is a CSS filter on the tile
          // pane (see leaflet.css), so remounting the layer only threw away
          // every cached tile and re-downloaded the whole viewport. The
          // attribution is a licence condition of the OSM tile service and must
          // stay regardless of theme.
          attribution={attribution}
          url={tileUrl}
          maxZoom={19}
        />

        <AutoFitBounds
          listings={listings}
          enabled={autoFitBounds}
          singleZoom={singleMarkerZoom}
        />
        <FocusSelectedListing listings={listings} selectedListingId={selectedListingId} />

        {listings.map((l) => {
          if (l.lat === undefined || l.lat === null || l.lng === undefined || l.lng === null) {
            return null;
          }

          const isSelected = selectedListingId === l.id;
          const pinIcon = createCustomPin(l, isSelected);

          return (
            <Marker
              key={l.id}
              position={[Number(l.lat), Number(l.lng)]}
              icon={pinIcon}
              eventHandlers={{
                click: () => onSelectListing?.(l),
              }}
            >
              <Popup>
                <div className="p-3 max-w-[240px] text-slate-900 dark:text-slate-100 space-y-1.5">
                  {/* Thumbnail Image if available */}
                  {l.image_url && (
                    <div className="w-full h-20 rounded-lg overflow-hidden mb-1.5 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={l.image_url}
                        alt={l.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Header: Title & Verified */}
                  <div className="flex items-start justify-between gap-1.5">
                    <Link
                      to={`/listings/${l.id}`}
                      className="font-extrabold text-xs text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition leading-tight line-clamp-1"
                    >
                      {l.name}
                    </Link>
                    {l.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950 flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Category & Open Badge */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <OpenStatusBadge hours={l.hours} size="sm" />
                    {l.category && (
                      <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800/60">
                        {l.category.name}
                      </span>
                    )}
                  </div>

                  {/* Rating if available */}
                  {l.average_rating ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{l.average_rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({l.review_count})</span>
                    </div>
                  ) : null}

                  {/* Address */}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                    {l.address}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                    {l.phone ? (
                      <a
                        href={`tel:${l.phone}`}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    ) : (
                      <span />
                    )}

                    <Link
                      to={`/listings/${l.id}`}
                      className="text-[11px] text-orange-600 dark:text-orange-400 font-bold hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
