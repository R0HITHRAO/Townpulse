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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 relative animate-scale-in transition-colors duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 p-3 rounded-2xl animate-float shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Claim This Listing</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">{listing.name}</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-slate-300 mb-6 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 leading-relaxed">
          Are you the owner or authorized operator of this facility? Claiming grants you editing privileges, verified badges, and listing analytics.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Proof of Ownership Document URL (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://example.com/trade-license.pdf"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
              Upload your trade license, utility bill, or certificate link.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Message to Administrator
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="State your role (e.g. Founder, Head Doctor, Manager) and contact phone..."
              className="w-full p-3 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5 hover:scale-105 active:scale-95"
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
