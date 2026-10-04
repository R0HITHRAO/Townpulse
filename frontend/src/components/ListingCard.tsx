import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin, CheckCircle2, Navigation, Star, Heart, MessageCircle } from 'lucide-react';
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
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs backdrop-blur-xs transition-all duration-400 ease-fluid hover:-translate-y-1.5 hover:border-orange-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-orange-600 shine-sweep">
      {/* Gradient accent line that draws in from the left on hover */}
      <span
        className="accent-line pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-400"
        aria-hidden="true"
      />
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
              className="absolute right-2 top-2 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md text-slate-400 hover:text-rose-500 transition duration-300 ease-fluid hover:scale-110"
              title={bookmarked ? 'Remove from saved' : 'Save to favorites'}
              aria-label={
                bookmarked
                  ? `Remove ${listing.name} from saved places`
                  : `Save ${listing.name} to saved places`
              }
              aria-pressed={bookmarked}
            >
              <Heart
                className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500 animate-heartbeat' : ''}`}
              />
            </button>
          </div>
        )}

        {/* Header: Name + Verified / Community Badge + Bookmark (if no image) */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            to={`/listings/${listing.id}`}
            className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition line-clamp-1 flex-1 after:absolute after:inset-0 after:content-['']"
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
                className="relative z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-400 hover:text-rose-500 transition duration-300 ease-fluid hover:scale-110"
                title={bookmarked ? 'Remove from saved' : 'Save to favorites'}
                aria-label={
                  bookmarked
                    ? `Remove ${listing.name} from saved places`
                    : `Save ${listing.name} to saved places`
                }
                aria-pressed={bookmarked}
              >
                <Heart
                  className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500 animate-heartbeat' : ''}`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Category, Open Status, Distance, and Rating Pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <OpenStatusBadge hours={listing.hours} size="sm" />
          {listing.category &&
            (listing.category.slug ? (
              <Link
                to={`/c/${listing.category.slug}`}
                className="relative z-10 text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-800/60 px-2.5 py-0.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/60 transition"
                title={`Browse ${listing.category.name}`}
              >
                {listing.category.icon} {listing.category.name}
              </Link>
            ) : (
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-800/60 px-2.5 py-0.5 rounded-lg">
                {listing.category.icon} {listing.category.name}
              </span>
            ))}
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
              className="relative z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
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
            className="relative z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
            title="Forward on WhatsApp"
            aria-label="Share listing on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>

          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              className="relative z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/60 text-slate-600 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
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
              className="relative z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/60 text-slate-600 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-400 border border-slate-200/80 dark:border-slate-700/80 transition hover:scale-105 active:scale-95"
              title="Directions"
              aria-label={`Get directions to ${listing.name}`}
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <span
          aria-hidden="true"
          className="pointer-events-none text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border border-orange-200/60 dark:border-orange-800/60 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs group-hover:bg-orange-600 group-hover:text-white group-hover:scale-[1.03]"
        >
          {t('listing.viewDetails')} →
        </span>
      </div>
    </div>
  );
};
