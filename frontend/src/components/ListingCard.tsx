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
    <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-xs)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--tp-border-strong)] hover:shadow-[var(--tp-shadow-md)]">
      {/* Gradient accent line that draws in from the left on hover */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--tp-primary)] to-[var(--tp-accent)]"
        aria-hidden="true"
      />
      <div>
        {/* Optional Thumbnail Image */}
        {listing.image_url && (
          <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-[var(--tp-surface-2)]">
            <img
              src={listing.image_url}
              alt={listing.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Bookmark button on top of thumbnail */}
            <button
              onClick={() => toggleBookmark(listing)}
              aria-pressed={bookmarked}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--tp-border)] bg-[var(--tp-surface)]/95 text-[var(--tp-text-subtle)] shadow-[var(--tp-shadow-sm)] transition-colors hover:text-[var(--tp-urgent)]"
              title={bookmarked ? 'Remove from saved' : 'Save to favorites'}
              aria-label="Toggle favorite bookmark"
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
            className="flex-1 font-[var(--tp-font-display)] text-lg font-bold text-[var(--tp-text)] transition-colors group-hover:text-[var(--tp-primary)] line-clamp-1"
          >
            {listing.name}
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {listing.verified ? (
              <span
                className="tp-badge tp-badge-verified"
                title="Verified by Local Administrator"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t('verified')}</span>
              </span>
            ) : (
              <span className="tp-badge tp-badge-neutral">
                Community
              </span>
            )}

            {!listing.image_url && (
              <button
                onClick={() => toggleBookmark(listing)}
                aria-pressed={bookmarked}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--tp-text-subtle)] transition-colors hover:text-[var(--tp-urgent)]"
                title={bookmarked ? 'Remove from saved' : 'Save to favorites'}
                aria-label="Toggle favorite bookmark"
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
          {listing.category && (
            <span className="rounded-full border border-[var(--tp-border)] bg-[var(--tp-surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--tp-text-muted)]">
              {listing.category.icon} {listing.category.name}
            </span>
          )}
          {distanceText && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--tp-border)] bg-[var(--tp-surface-2)] px-2 py-1 text-xs font-medium text-[var(--tp-text-muted)]">
              <MapPin aria-hidden="true" className="h-3 w-3" /> {distanceText}
            </span>
          )}
          {listing.average_rating ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--tp-warn)]/30 bg-[var(--tp-warn-soft)] px-2 py-1 text-xs font-bold text-[var(--tp-warn-soft-text)]">
              <Star aria-hidden="true" className="h-3 w-3 fill-current" />
              <span>{listing.average_rating.toFixed(1)}</span>
              <span className="text-xs font-normal">({listing.review_count})</span>
            </span>
          ) : null}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="mb-3 text-sm leading-relaxed text-[var(--tp-text-muted)] line-clamp-2">
            {listing.description}
          </p>
        )}

        {/* Address */}
        <div className="mb-4 flex items-start gap-1.5 text-sm text-[var(--tp-text-subtle)]">
          <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--tp-text-subtle)]" />
          <span className="line-clamp-1">{listing.address}</span>
        </div>
      </div>

      {/* Action Footer: Contact, WhatsApp & Navigation */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--tp-border)] pt-3">
        <div className="flex items-center gap-1.5">
          {listing.phone && (
            <a
              href={`tel:${listing.phone}`}
              className="tp-btn-icon"
              title={`Call ${listing.phone}`}
              aria-label={`Call ${listing.name}`}
            >
              <Phone aria-hidden="true" className="h-4 w-4" />
            </a>
          )}

          {/* 1-Tap WhatsApp Share */}
          <a
            href={getWhatsAppShareUrl(listing)}
            target="_blank"
            rel="noopener noreferrer"
            className="tp-btn-icon"
            title="Forward on WhatsApp"
            aria-label="Share listing on WhatsApp"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
          </a>

          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              className="tp-btn-icon"
              title={`Email ${listing.email}`}
              aria-label={`Email ${listing.name}`}
            >
              <Mail aria-hidden="true" className="h-4 w-4" />
            </a>
          )}

          {listing.lat && listing.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tp-btn-icon"
              title="Directions"
              aria-label={`Get directions to ${listing.name}`}
            >
              <Navigation aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
        </div>

        <Link
          to={`/listings/${listing.id}`}
          className="tp-btn tp-btn-secondary min-h-11 gap-1.5 rounded-xl px-3 text-xs"
        >
          View Details →
        </Link>
      </div>
    </article>
  );
};
