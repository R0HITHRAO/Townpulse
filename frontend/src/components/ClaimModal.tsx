import React, { useState } from 'react';
import { ShieldCheck, X, FileText, Send, AlertCircle } from 'lucide-react';
import { api, Listing } from '../services/api';
import { isAuthenticated } from '../services/auth';
import { useNavigate } from 'react-router-dom';

interface ClaimModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [proofUrl, setProofUrl] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.claimListing(listing.id, proofUrl || undefined, message || undefined);
      alert('Your claim has been submitted! An administrator will review and verify it.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Claim This Listing</h3>
            <p className="text-xs text-gray-500 line-clamp-1">{listing.name}</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-6 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 leading-relaxed">
          Are you the owner or authorized operator of this facility? Claiming grants you editing privileges, verified badges, and listing analytics.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Proof of Ownership Document URL (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://example.com/trade-license.pdf"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Upload your trade license, utility bill, or certificate link.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Message to Administrator
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="State your role (e.g. Founder, Head Doctor, Manager) and contact phone..."
              className="w-full p-3 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
