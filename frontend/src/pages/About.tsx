import React from 'react';
import { ShieldCheck, Database, HeartHandshake, Map, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-gray-200 shadow-sm">
        <div className="space-y-2 border-b border-gray-100 pb-6">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mission</span>
          <h1 className="text-3xl font-extrabold text-gray-900">About TownPulse</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            TownPulse is open-source community infrastructure designed specifically for small towns, rural municipalities, and local volunteer networks.
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900">Why TownPulse Exists</h2>
          <p>
            Global search engines and map monopolies are built for mega-cities with commercial advertising budgets. In small towns, critical community infrastructure — primary health centres, emergency animal shelters, grain mills, and local plumbers — are either missing, out-of-date, or claimed by fake listings.
          </p>
          <p>
            TownPulse provides a verified, community-governed directory that gives power back to local communities, ensuring that contact info, hours, and locations remain accurate and trustworthy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Verified Local Trust
            </div>
            <p className="text-xs text-blue-800/80">
              Businesses and civic services undergo admin verification with phone OTP and registration proof.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              Open Data Ownership
            </div>
            <p className="text-xs text-emerald-800/80">
              Town data belongs to the community. Exportable datasets in open CSV formats for disaster relief and civic planning.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <Link to="/" className="text-xs font-semibold text-blue-600 hover:underline">
            ← Back to Directory
          </Link>
          <Link
            to="/submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
          >
            Submit a Listing <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
