import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, Listing } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Briefcase, Building, CheckCircle2, Eye, PhoneCall, Plus, Edit } from 'lucide-react';

export const BusinessDashboard: React.FC = () => {
  const user = getCurrentUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .searchListings({ per_page: 50 })
      .then((res) => {
        // Filter listings owned by this user
        const owned = res.items.filter((l) => l.owner_user_id === user?.id);
        setListings(owned);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 text-emerald-700 p-4 rounded-2xl">
              <Briefcase className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Business Owner Dashboard</h1>
              <p className="text-xs text-gray-500">Welcome back, {user?.name || user?.email}</p>
            </div>
          </div>

          <Link
            to="/submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Another Business
          </Link>
        </div>

        {/* Owned Listings Section */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            My Managed Services ({listings.length})
          </h2>

          {loading ? (
            <LoadingSpinner message="Loading your business listings..." />
          ) : listings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-3">
              <p className="text-sm text-gray-500">
                You have not claimed or created any business listings yet.
              </p>
              <p className="text-xs text-gray-400">
                Find your service on the home page and click "Claim This Business" or submit a new one.
              </p>
              <Link
                to="/"
                className="inline-block text-xs font-semibold text-blue-600 hover:underline pt-2"
              >
                Browse directory to claim your listing →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 text-base line-clamp-1">{l.name}</h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{l.address}</p>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Added {new Date(l.created_at).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/listings/${l.id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View Public Page →
                    </Link>
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
