import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, Listing } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ClaimModal } from '../components/ClaimModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { ReviewSection } from '../components/ReviewSection';
import { StarRating } from '../components/StarRating';
import { OpenStatusBadge } from '../components/OpenStatusBadge';
import { useBookmarks } from '../context/BookmarkContext';
import { getWhatsAppShareUrl } from '../utils/whatsapp';
import { Map } from '../components/Map';
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Flag,
  ArrowLeft,
  Navigation,
  Share2,
  Check,
  QrCode,
  Heart,
  MessageCircle,
} from 'lucide-react';

export const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [copied, setCopied] = useState(false);

  const bookmarked = listing ? isBookmarked(listing.id) : false;

  const fetchListing = () => {
    if (!id) return;
    setLoading(true);
    api
      .getListing(id)
      .then(setListing)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleShare = async () => {
    if (!listing) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.name} on TownPulse`,
          text: `Check out ${listing.name} in our local directory.`,
          url: window.location.href,
        });
      } catch (err) {
        // Fallback to copy
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reportReason.trim()) return;
    try {
      await api.reportListing(id, reportReason);
      alert('Thank you for your report. Moderators will review it.');
      setReportOpen(false);
      setReportReason('');
    } catch (e: any) {
      alert(e.message || 'Report submission failed');
    }
  };

  if (loading) return <LoadingSpinner message="Loading listing details..." />;
  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Listing not found</h2>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
          ← Return to Directory
        </Link>
      </div>
    );
  }

  // Directions link
  const directionsUrl = listing.lat && listing.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(listing.address)}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
        {/* Navigation & Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-2xs hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Listings
          </Link>

          <div className="flex items-center gap-2">
            {/* Bookmark Favorite */}
            <button
              onClick={() => toggleBookmark(listing)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition shadow-2xs hover:scale-105 active:scale-95 ${
                bookmarked
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {/* 1-Tap WhatsApp Forward */}
            <a
              href={getWhatsAppShareUrl(listing)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition hover:scale-105 active:scale-95"
              title="Forward on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* Storefront QR Code */}
            <button
              onClick={() => setQrOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition hover:scale-105 active:scale-95"
              title="Generate Storefront QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>QR Code</span>
            </button>

            {/* Standard Share */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-200">
          {/* Storefront Image Hero (if available) */}
          {listing.image_url && (
            <div className="relative w-full h-64 sm:h-80 overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={listing.image_url}
                alt={listing.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <OpenStatusBadge hours={listing.hours} size="md" />

                  {listing.category && (
                    <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 px-3 py-1 rounded-full">
                      {listing.category.icon} {listing.category.name}
                    </span>
                  )}
                  {listing.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                      Verified Official Listing
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                      Community Submitted
                    </span>
                  )}

                  {/* Rating Badge */}
                  {listing.average_rating ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                      <StarRating rating={Math.round(listing.average_rating)} size="sm" />
                      <span>{listing.average_rating.toFixed(1)}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">({listing.review_count})</span>
                    </div>
                  ) : null}
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {listing.name}
                </h1>
              </div>

              {/* Claim button */}
              {!listing.owner_user_id && (
                <button
                  onClick={() => setClaimOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex-shrink-0 hover:scale-105 active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Claim This Business
                </button>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">About this Service</h2>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Contact Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {listing.phone && (
                <a
                  href={`tel:${listing.phone}`}
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition text-center gap-1.5 group hover:scale-[1.03] active:scale-[0.97]"
                >
                  <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold">Call Service</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full font-mono">{listing.phone}</span>
                </a>
              )}

              {listing.email && (
                <a
                  href={`mailto:${listing.email}`}
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition text-center gap-1.5 group hover:scale-[1.03] active:scale-[0.97]"
                >
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold">Send Email</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full">{listing.email}</span>
                </a>
              )}

              {listing.website && (
                <a
                  href={listing.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-slate-800 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition text-center gap-1.5 group hover:scale-[1.03] active:scale-[0.97]"
                >
                  <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold">Website</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full">Visit official site</span>
                </a>
              )}

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition text-center gap-1.5 group hover:scale-[1.03] active:scale-[0.97]"
              >
                <Navigation className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition" />
                <span className="text-xs font-bold">Get Directions</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full">Open in Maps</span>
              </a>
            </div>

            {/* Location & Timings */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Location & Timings</h2>
              <div className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <MapPin className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-900 dark:text-white">Physical Address</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">{listing.address}</span>
                </div>
              </div>

              {listing.hours && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 flex-1">
                    <span className="font-semibold block text-slate-900 dark:text-white">Opening Hours</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {Object.entries(listing.hours).map(([day, time]) => (
                        <div key={day} className="flex justify-between bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                          <span className="capitalize text-slate-500 dark:text-slate-400 font-medium">{day.replace('_', ' ')}</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mini Map */}
            {listing.lat && listing.lng && (
              <div className="pt-2">
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">Map Location</h2>
                <Map
                  listings={[listing]}
                  center={[Number(listing.lat), Number(listing.lng)]}
                  zoom={15}
                  className="h-56 shadow-xs rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                />
              </div>
            )}

            {/* Report Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-400">
              <span>Last updated: {new Date(listing.updated_at).toLocaleDateString()}</span>
              <button
                onClick={() => setReportOpen(true)}
                className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 font-medium transition"
              >
                <Flag className="w-3.5 h-3.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400" />
                <span>Report Incorrect Information</span>
              </button>
            </div>
          </div>
        </div>

        {/* Community Reviews & Ratings Section */}
        <ReviewSection listingId={listing.id} />

        {/* Storefront QR Code Modal */}
        <QRCodeModal
          listing={listing}
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
        />

        {/* Report Modal */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 animate-scale-in">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Inaccurate Listing</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Please describe the issue (e.g. permanently closed, incorrect phone number, wrong address). Our moderators will investigate.
              </p>
              <textarea
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm hover:scale-105 active:scale-95"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Claim Modal */}
        <ClaimModal
          listing={listing}
          isOpen={claimOpen}
          onClose={() => setClaimOpen(false)}
          onSuccess={fetchListing}
        />
      </div>
    </div>
  );
};
