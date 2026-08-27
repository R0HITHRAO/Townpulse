import React, { useState, useEffect } from 'react';
import { api, Claim, Listing } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Building,
  Download,
  AlertTriangle,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getAnalytics().catch(() => ({})),
      api.getPendingClaims().catch(() => []),
      api.getPendingListings().catch(() => []),
    ])
      .then(([stats, claims, listings]) => {
        setAnalytics(stats);
        setPendingClaims(claims);
        setPendingListings(listings);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveClaim = async (claimId: string) => {
    try {
      await api.approveClaim(claimId);
      alert('Claim approved! Ownership has been transferred.');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Approval failed');
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    const reason = prompt('Enter reason for rejection (optional):');
    try {
      await api.rejectClaim(claimId, reason || undefined);
      alert('Claim rejected.');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Rejection failed');
    }
  };

  const handleVerifyListing = async (listingId: string) => {
    try {
      await api.verifyListing(listingId);
      alert('Listing verified and marked active!');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Verification failed');
    }
  };

  const exportCSV = () => {
    api.searchListings({ per_page: 100 }).then((res) => {
      const rows = [
        ['ID', 'Name', 'Category', 'Address', 'Phone', 'Verified'],
        ...res.items.map((l) => [
          l.id,
          `"${l.name}"`,
          `"${l.category?.name || ''}"`,
          `"${l.address}"`,
          l.phone || '',
          l.verified ? 'Yes' : 'No',
        ]),
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `townpulse_listings_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (loading) return <LoadingSpinner message="Loading moderation metrics..." />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              Town Administrator Console
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Community moderation, data verification, and platform metrics
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            Export CSV Dataset
          </button>
        </div>

        {/* Analytics KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
              <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Total Listings
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {analytics.total_listings || 0}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {analytics.verification_rate_percent || 0}% Verified
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Total Users
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {analytics.total_users || 0}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-400">
              {analytics.business_owners || 0} Business Owners
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Pending Claims
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {pendingClaims.length}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-400">Awaiting proof review</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Submissions
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {pendingListings.length}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-400">Unverified submissions</span>
          </div>
        </div>

        {/* Pending Claims Queue */}
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Pending Business Claims ({pendingClaims.length})
          </h2>

          {pendingClaims.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-400 py-4">No pending claims waiting for review.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {pendingClaims.map((c) => (
                <div key={c.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-900 dark:text-white">Claim ID: {c.id.slice(0, 8)}...</div>
                    <div className="text-xs text-gray-600 dark:text-slate-300">Claimant: {c.user?.name || c.user?.email || 'Registered User'}</div>
                    {c.message && <div className="text-xs text-gray-500 dark:text-slate-400 italic bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">"{c.message}"</div>}
                    {c.proof_url && (
                      <a
                        href={c.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 underline block"
                      >
                        View Verification Proof Document ↗
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApproveClaim(c.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 hover:scale-105 active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectClaim(c.id)}
                      className="bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 hover:scale-105 active:scale-95"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Listings Queue */}
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Unverified Listings ({pendingListings.length})
          </h2>

          {pendingListings.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-400 py-4">All listings are verified!</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {pendingListings.map((l) => (
                <div key={l.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{l.name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{l.address}</div>
                    {l.phone && <div className="text-xs text-gray-400 dark:text-slate-500">Phone: {l.phone}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerifyListing(l.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 hover:scale-105 active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Verify Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
