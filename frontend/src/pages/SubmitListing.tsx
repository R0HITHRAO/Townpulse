import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ListingForm } from '../components/ListingForm';
import { api, Listing } from '../services/api';
import { isAuthenticated } from '../services/auth';
import { PlusCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

export const SubmitListing: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const auth = isAuthenticated();

  const handleSubmit = async (data: Partial<Listing>) => {
    if (!auth) {
      alert('Please log in or register before submitting a listing.');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createListing(data);
      alert('Service submitted successfully! It is now live in the town directory.');
      navigate(`/listings/${created.id}`);
    } catch (e: any) {
      alert(e.message || 'Failed to submit listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-100 text-blue-700 rounded-2xl mb-1">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Submit a Local Service or Business
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
            Help your town community discover essential services, clinics, emergency shelters, and trade professionals.
          </p>
        </div>

        {!auth && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Sign in required:</span> You need an account so you can manage this listing later.
              <Link to="/login" className="underline font-bold ml-1">
                Log in or Register →
              </Link>
            </div>
          </div>
        )}

        <ListingForm onSubmit={handleSubmit} isSubmitting={submitting} />
      </div>
    </div>
  );
};
