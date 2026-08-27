import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Globe, MapPin, CheckCircle2, Navigation, Star, Heart, MessageCircle } from 'lucide-react';
import { Listing } from '../services/api';
import { OpenStatusBadge } from './OpenStatusBadge';
import { useBookmarks } from '../context/BookmarkContext';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

interface ListingCardProps {
  listing: Listing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { t } = useTranslation();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(listing.id);

  // Format distance
  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)} m away`;
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  const distanceText = formatDistance(listing.distance_meters);

  return (
    <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group hover:border-blue-400 dark:hover:border-blue-600 animate-fade-in backdrop-blur-xs overflow-hidden relative">
      <div>
        {/* Optional Thumbnail Image */}
        {listing.image_url && (
          <div className="w-full h-36 rounded-xl overflow-hidden mb-3.5 bg-slate-100 dark:bg-slate-800 relative">
            <img
              src={listing.image_url}
              alt={listing.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Bookmark button on top of thumbnail */}
            <button
              onClick={() => toggleBookmark(listing)}
              className="absolute right-2 top-2 p-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md text-slate-400 hover:text-rose-500 transition hover:scale-110"
              title={bookmarked ? 'Remove from saved' : 'Save to favorites'}
              aria-label="Toggle favorite bookmark"
            >
              <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        )}

        {/* Header: Name + Verified / Community Badge + Bookmark (if no image) */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            to={`/listings/${listing.id}`}
            className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1 flex-1"
          >
            {listing.name}
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {listing.verified ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full"
                title="Verified by Local Administrator"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('verified')}</span>
              </span>
            ) : (
              <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700">
                Community
              </span>
            )}

            {!listing.image_url && (
              <button
                onClick={() => toggleBookmark(listing)}
                className="p-1 text-slate-400 hover:text-rose-500 transition hover:scale-110"
                title={bookmarked ? 'Remove from saved' : 'Save to favorites'}
                aria-label="Toggle favorite bookmark"
              >
                <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Category, Open Status, Distance, and Rating Pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <OpenStatusBadge hours={listing.hours} size="sm" />
          {listing.category && (
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 px-2.5 py-0.5 rounded-lg">
              {listing.category.icon} {listing.category.name}
            </span>
          )}
          {distanceText && (
            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-800/60">
              📍 {distanceText}
            </span>
          )}
          {listing.average_rating ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800/60">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{listing.average_rating.toFixed(1)}</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">({listing.review_count})</span>
            </span>
          ) : null}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {listing.description}
          </p>
        )}

        {/* Address */}
        <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{listing.address}</span>
        </div>
      </div>

      {/* Action Footer: Contact, WhatsApp & Navigation */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {listing.phone && (
            <a
              href={`tel:${listing.phone}`}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
              title={`Call ${listing.phone}`}
              aria-label={`Call ${listing.name}`}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}

          {/* 1-Tap WhatsApp Share */}
          <a
            href={getWhatsAppShareUrl(listing)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
            title="Forward on WhatsApp"
            aria-label="Share listing on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>

          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
              title={`Email ${listing.email}`}
              aria-label={`Email ${listing.name}`}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}

          {listing.lat && listing.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
              title="Directions"
              aria-label={`Get directions to ${listing.name}`}
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <Link
          to={`/listings/${listing.id}`}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-white dark:hover:text-white bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 dark:hover:bg-blue-600 border border-blue-200/60 dark:border-blue-800/60 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs hover:shadow-sm hover:scale-[1.03] active:scale-[0.97]"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
};
