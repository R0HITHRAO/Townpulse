import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, Listing } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ClaimModal } from '../components/ClaimModal';
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
} from 'lucide-react';

export const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

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
        <h2 className="text-xl font-bold text-gray-900 mb-2">Listing not found</h2>
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Return to Home
        </Link>
      </div>
    );
  }

  // Google Maps / OpenStreetMap directions link
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    listing.address
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Listings
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {listing.category && (
                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    {listing.category.icon} {listing.category.name}
                  </span>
                )}
                {listing.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                    Verified Official Listing
                  </span>
                ) : (
                  <span className="text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
                    Community Submitted
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {listing.name}
              </h1>
            </div>

            {/* Claim button */}
            {!listing.owner_user_id && (
              <button
                onClick={() => setClaimOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition flex-shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                Claim This Business
              </button>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          )}

          {/* Contact Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {listing.phone && (
              <a
                href={`tel:${listing.phone}`}
                className="flex flex-col items-center justify-center p-3.5 bg-gray-50 hover:bg-emerald-50 text-gray-800 hover:text-emerald-700 rounded-2xl border border-gray-200 transition text-center gap-1"
              >
                <Phone className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold">Call</span>
                <span className="text-[11px] text-gray-500 truncate max-w-full">{listing.phone}</span>
              </a>
            )}

            {listing.email && (
              <a
                href={`mailto:${listing.email}`}
                className="flex flex-col items-center justify-center p-3.5 bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-700 rounded-2xl border border-gray-200 transition text-center gap-1"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold">Email</span>
                <span className="text-[11px] text-gray-500 truncate max-w-full">Send message</span>
              </a>
            )}

            {listing.website && (
              <a
                href={listing.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3.5 bg-gray-50 hover:bg-purple-50 text-gray-800 hover:text-purple-700 rounded-2xl border border-gray-200 transition text-center gap-1"
              >
                <Globe className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-bold">Website</span>
                <span className="text-[11px] text-gray-500 truncate max-w-full">Visit site</span>
              </a>
            )}

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3.5 bg-gray-50 hover:bg-amber-50 text-gray-800 hover:text-amber-700 rounded-2xl border border-gray-200 transition text-center gap-1"
            >
              <Navigation className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold">Directions</span>
              <span className="text-[11px] text-gray-500 truncate max-w-full">Open Maps</span>
            </a>
          </div>

          {/* Location & Address */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location & Timings</h2>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span>{listing.address}</span>
            </div>

            {listing.hours && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-700 space-y-1">
                  <span className="font-semibold block text-gray-900">Operating Timings</span>
                  {Object.entries(listing.hours).map(([day, time]) => (
                    <div key={day} className="flex gap-2">
                      <span className="capitalize text-gray-500">{day.replace('_', ' ')}:</span>
                      <span className="font-medium text-gray-900">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mini Map */}
          {listing.lat && listing.lng && (
            <div className="pt-2">
              <Map
                listings={[listing]}
                center={[Number(listing.lat), Number(listing.lng)]}
                zoom={15}
                className="h-64 shadow-xs"
              />
            </div>
          )}

          {/* Report Footer */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-gray-400">
            <span>Last updated: {new Date(listing.updated_at).toLocaleDateString()}</span>
            <button
              onClick={() => setReportOpen(true)}
              className="text-gray-500 hover:text-red-600 flex items-center gap-1 font-medium transition"
            >
              <Flag className="w-3.5 h-3.5" /> Report Inaccurate Information
            </button>
          </div>
        </div>

        {/* Report Modal */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
              <h3 className="text-base font-bold text-gray-900">Report Listing</h3>
              <p className="text-xs text-gray-500">
                Please describe the issue (e.g. permanently closed, incorrect phone number, fraudulent listing).
              </p>
              <textarea
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Details of the issue..."
                className="w-full p-3 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg"
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
