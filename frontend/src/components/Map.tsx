import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Listing } from '../services/api';
import { Phone, CheckCircle2 } from 'lucide-react';

// Fix default leaflet marker icon issue in Webpack/Vite bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pin marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

interface MapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  selectedListingId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  className?: string;
}

// Helper to recenter map when center prop updates
const RecenterMap: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const Map: React.FC<MapProps> = ({
  listings,
  center = [12.9716, 77.5946],
  zoom = 13,
  selectedListingId,
  onSelectListing,
  className = 'h-[500px] w-full',
}) => {
  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200 shadow-sm ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} zoom={zoom} />

        {listings.map((l) => {
          if (l.lat === undefined || l.lat === null || l.lng === undefined || l.lng === null) {
            return null;
          }

          return (
            <Marker
              key={l.id}
              position={[Number(l.lat), Number(l.lng)]}
              icon={customIcon}
              eventHandlers={{
                click: () => onSelectListing?.(l),
              }}
            >
              <Popup>
                <div className="p-1 max-w-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm mb-1">
                    <span>{l.name}</span>
                    {l.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 flex-shrink-0" />
                    )}
                  </div>

                  {l.category && (
                    <div className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                      {l.category.icon} {l.category.name}
                    </div>
                  )}

                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{l.address}</p>

                  <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                    {l.phone && (
                      <a
                        href={`tel:${l.phone}`}
                        className="text-xs text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    )}
                    <Link
                      to={`/listings/${l.id}`}
                      className="text-xs text-blue-600 font-semibold hover:underline ml-auto"
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
