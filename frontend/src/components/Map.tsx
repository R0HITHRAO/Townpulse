import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Listing } from '../services/api';
import { Phone, CheckCircle2, Navigation, Star, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OpenStatusBadge } from './OpenStatusBadge';

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
 * Creates custom circular badge pin for each listing
 */
function createCustomPin(listing: Listing, isSelected: boolean): L.DivIcon {
  const iconChar = listing.category?.icon || '📍';
  const categoryName = listing.category?.name || '';
  const borderColor = categoryColors[categoryName] || '#2563eb';

  const html = `
    <div class="townpulse-pin-badge ${isSelected ? 'selected' : ''}" style="border-color: ${borderColor};">
      <span>${iconChar}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: html,
    iconSize: [38, 44],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
  });
}

interface MapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  selectedListingId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  className?: string;
  autoFitBounds?: boolean;
}

// Auto Fit Bounds to all markers with comfortable margin
const AutoFitBounds: React.FC<{ listings: Listing[]; enabled?: boolean }> = ({ listings, enabled = true }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || listings.length === 0) return;

    const validCoords = listings
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => [Number(l.lat), Number(l.lng)] as [number, number]);

    if (validCoords.length === 0) return;

    if (validCoords.length === 1) {
      map.setView(validCoords[0], 15, { animate: true });
    } else {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [listings, enabled, map]);

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
      map.flyTo([Number(target.lat), Number(target.lng)], 16, { duration: 1.2 });
    }
  }, [selectedListingId, listings, map]);

  return null;
};

export const Map: React.FC<MapProps> = ({
  listings,
  center = [12.9716, 77.5946],
  zoom = 13,
  selectedListingId,
  onSelectListing,
  className = 'h-[500px] w-full',
  autoFitBounds = true,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Crisp modern CartoDB Positron / Dark Matter tiles for clean street presentation
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

  const attribution =
    '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative z-10 ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          key={tileUrl}
          attribution={attribution}
          url={tileUrl}
          maxZoom={19}
        />

        <AutoFitBounds listings={listings} enabled={autoFitBounds} />
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
                <div className="p-3.5 max-w-[260px] text-slate-900 dark:text-slate-100 space-y-2">
                  {/* Thumbnail Image if available */}
                  {l.image_url && (
                    <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
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
                      className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition leading-tight line-clamp-1"
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
                      <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/60">
                        {l.category.name}
                      </span>
                    )}
                  </div>

                  {/* Rating if available */}
                  {l.average_rating ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{l.average_rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({l.review_count})</span>
                    </div>
                  ) : null}

                  {/* Address */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                    {l.address}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                    {l.phone ? (
                      <a
                        href={`tel:${l.phone}`}
                        className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    ) : (
                      <span />
                    )}

                    <Link
                      to={`/listings/${l.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
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
