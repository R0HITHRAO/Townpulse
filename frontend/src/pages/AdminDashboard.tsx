import React, { useState, useEffect } from 'react';
import { api, Claim, Listing, EmergencyAlert } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Shield,
  CheckCircle,
  XCircle,
  Users,
  Building,
  Download,
  AlertTriangle,
  Radio,
  Plus,
  Trash2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  // Inline, non-blocking feedback for every moderation action — replaces
  // `alert()` (AUDIT.md 8.3): alerts are unstyled, untranslatable and modal.
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  );

  // New Alert Form state
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'info' | 'warning' | 'critical'>('warning');
  const [alertLink, setAlertLink] = useState('');
  const [creatingAlert, setCreatingAlert] = useState(false);
  // Rejection needs a reason, so it gets a small dialog instead of
  // window.prompt(), which cannot be styled, translated or announced.
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  // Deactivation is destructive, so the row asks in place rather than through
  // a blocking window.confirm().
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getAnalytics().catch(() => ({})),
      api.getPendingClaims().catch(() => []),
      api.getPendingListings().catch(() => []),
      api.getActiveAlerts().catch(() => []),
    ])
      .then(([stats, claims, listings, alerts]) => {
        setAnalytics(stats);
        setPendingClaims(claims);
        setPendingListings(listings);
        setActiveAlerts(alerts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveClaim = async (claimId: string) => {
    setFeedback(null);
    try {
      await api.approveClaim(claimId);
      setFeedback({
        tone: 'success',
        message: 'Claim approved — ownership has been transferred.',
      });
      loadData();
    } catch (e: any) {
      setFeedback({ tone: 'error', message: e.message || 'Approval failed' });
    }
  };

  const openRejectDialog = (claimId: string) => {
    setRejectingClaimId(claimId);
    setRejectReason('');
    setRejectError(null);
  };

  const closeRejectDialog = () => {
    setRejectingClaimId(null);
    setRejectReason('');
    setRejectError(null);
  };

  const handleRejectClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingClaimId) return;
    setRejectError(null);
    setRejectSubmitting(true);
    try {
      await api.rejectClaim(rejectingClaimId, rejectReason.trim() || undefined);
      setFeedback({ tone: 'success', message: 'Claim rejected.' });
      closeRejectDialog();
      loadData();
    } catch (err: any) {
      // Keep the dialog open so a failed request does not discard the reason.
      setRejectError(err.message || 'Rejection failed');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleVerifyListing = async (listingId: string) => {
    setFeedback(null);
    try {
      await api.verifyListing(listingId);
      setFeedback({ tone: 'success', message: 'Listing verified and marked active.' });
      loadData();
    } catch (e: any) {
      setFeedback({ tone: 'error', message: e.message || 'Verification failed' });
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    setFeedback(null);
    try {
      setCreatingAlert(true);
      await api.createAlert({
        title: alertTitle.trim(),
        message: alertMessage.trim(),
        severity: alertSeverity,
        link_url: alertLink.trim() || undefined,
      });
      setFeedback({ tone: 'success', message: 'Emergency broadcast published live.' });
      setAlertTitle('');
      setAlertMessage('');
      setAlertLink('');
      loadData();
    } catch (e: any) {
      setFeedback({
        tone: 'error',
        message: e.message || 'Failed to create emergency alert',
      });
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleDeactivateAlert = async (alertId: string) => {
    setFeedback(null);
    setDeactivating(true);
    try {
      await api.deactivateAlert(alertId);
      setFeedback({ tone: 'success', message: 'Emergency announcement deactivated.' });
      setConfirmDeactivateId(null);
      loadData();
    } catch (e: any) {
      setFeedback({ tone: 'error', message: e.message || 'Failed to deactivate alert' });
    } finally {
      setDeactivating(false);
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
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              Town Administrator Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Community moderation, emergency alerts, data verification, and platform metrics
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Export CSV Dataset
          </button>
        </div>

        {/* Analytics KPIs */}
        {feedback && (
          <div
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${
              feedback.tone === 'error'
                ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            {feedback.tone === 'error' ? (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <Building className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              Total Listings
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {analytics.total_listings || 0}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {analytics.verification_rate_percent || 0}% Verified
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Total Users
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {analytics.total_users || 0}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400">
              {analytics.business_owners || 0} Business Owners
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Pending Claims
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {pendingClaims.length}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400">Awaiting proof review</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <Radio className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Active Broadcasts
            </div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {activeAlerts.length}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400">Town civic alerts</span>
          </div>
        </div>

        {/* Emergency Alert Broadcast Manager */}
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
                <span>Municipal Emergency Broadcast Manager</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Broadcast instant warnings (flood, extreme weather, power outage) to every visitor on the platform.
              </p>
            </div>
          </div>

          {/* Form to create alert */}
          <form onSubmit={handleCreateAlert} className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Title *
                </label>
                <input
                  type="text"
                  required
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="e.g. Flash Flood & Heavy Rainfall Warning"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Severity Level
                </label>
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="warning">⚠️ Warning (Amber)</option>
                  <option value="critical">🚨 Critical (Red)</option>
                  <option value="info">ℹ️ Informational (Blue)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Message *
              </label>
              <textarea
                required
                rows={2}
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Details of warning, helpline numbers, emergency shelter addresses..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <input
                type="url"
                value={alertLink}
                onChange={(e) => setAlertLink(e.target.value)}
                placeholder="Action Link URL (optional, e.g. official disaster bulletin)"
                className="w-full sm:w-80 text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />

              <button
                type="submit"
                disabled={creatingAlert}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{creatingAlert ? 'Broadcasting...' : 'Publish Live Alert'}</span>
              </button>
            </div>
          </form>

          {/* Active Alerts List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Currently Active Broadcasts ({activeAlerts.length})
            </h3>
            {activeAlerts.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">No active emergency alerts at this time.</div>
            ) : (
              activeAlerts.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        {a.severity}
                      </span>
                      <strong className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</strong>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{a.message}</p>
                  </div>

                  {confirmDeactivateId === a.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Deactivate?
                      </span>
                      <button
                        onClick={() => handleDeactivateAlert(a.id)}
                        disabled={deactivating}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition disabled:opacity-50"
                      >
                        {deactivating ? 'Removing...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeactivateId(null)}
                        disabled={deactivating}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeactivateId(a.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Deactivate alert"
                      aria-label="Deactivate alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Claims Queue */}
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Pending Business Claims ({pendingClaims.length})
          </h2>

          {pendingClaims.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 py-4">No pending claims waiting for review.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingClaims.map((c) => (
                <div key={c.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Claim ID: {c.id.slice(0, 8)}...</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">Claimant: {c.user?.name || c.user?.email || 'Registered User'}</div>
                    {c.message && <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">"{c.message}"</div>}
                    {c.proof_url && (
                      <a
                        href={c.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orange-600 dark:text-orange-400 underline block"
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
                      onClick={() => openRejectDialog(c.id)}
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
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            Unverified Listings ({pendingListings.length})
          </h2>

          {pendingListings.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 py-4">All listings are verified!</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingListings.map((l) => (
                <div key={l.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{l.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{l.address}</div>
                    {l.phone && <div className="text-xs text-slate-400 dark:text-slate-500">Phone: {l.phone}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerifyListing(l.id)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 hover:scale-105 active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Verify Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reject Claim Dialog */}
        {rejectingClaimId && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <form
              onSubmit={handleRejectClaim}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-claim-title"
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 animate-scale-in"
            >
              <h3
                id="reject-claim-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Reject this claim?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Ownership stays with the current owner. The claimant's account is not
                affected, and the reason below is optional.
              </p>

              <div>
                <label
                  htmlFor="reject-claim-reason"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Reason for rejection (optional)
                </label>
                <textarea
                  id="reject-claim-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Proof does not match the registered owner"
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {rejectError && (
                <p
                  role="alert"
                  className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl px-3 py-2"
                >
                  {rejectError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRejectDialog}
                  disabled={rejectSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition"
                >
                  {rejectSubmitting ? 'Rejecting...' : 'Reject claim'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
