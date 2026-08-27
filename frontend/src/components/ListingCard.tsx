import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Globe, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { Listing } from '../services/api';

interface ListingCardProps {
  listing: Listing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
      <div>
        {/* Header: Name + Verified Badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            to={`/listings/${listing.id}`}
            className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-1"
          >
            {listing.name}
          </Link>
          {listing.verified ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0"
              title="Verified by Local Administrator"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
              {t('verified')}
            </span>
          ) : (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">
              Community
            </span>
          )}
        </div>

        {/* Category Tag */}
        {listing.category && (
          <div className="mb-2">
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
              {listing.category.icon} {listing.category.name}
            </span>
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">
            {listing.description}
          </p>
        )}

        {/* Address */}
        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-4">
          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{listing.address}</span>
        </div>
      </div>

      {/* Action Footer: Contact links */}
      <div className="border-t border-gray-100 pt-3 mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {listing.phone && (
            <a
              href={`tel:${listing.phone}`}
              className="p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition"
              title={`Call ${listing.phone}`}
              aria-label={`Call ${listing.name}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              className="p-2 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition"
              title={`Email ${listing.email}`}
              aria-label={`Email ${listing.name}`}
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
          {listing.website && (
            <a
              href={listing.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-purple-700 transition"
              title={`Visit website`}
              aria-label={`Website for ${listing.name}`}
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
        </div>

        <Link
          to={`/listings/${listing.id}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          Details →
        </Link>
      </div>
    </div>
  );
};
