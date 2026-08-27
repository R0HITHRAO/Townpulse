import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, Review, ReviewListResponse } from '../services/api';
import { StarRating } from './StarRating';
import { MessageSquare, Star, Trash2, Send, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewSectionProps {
  listingId: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ listingId }) => {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.getReviews(listingId);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.addReview(listingId, rating, comment.trim() || undefined);
      setSuccess(true);
      setComment('');
      setTimeout(() => setSuccess(false), 3000);
      await fetchReviews();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.deleteReview(reviewId);
      await fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm mt-8">
      {/* Header: Title + Overall Rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Community Reviews & Ratings</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real feedback from local verified residents and visitors.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {data.average_rating > 0 ? data.average_rating.toFixed(1) : '—'}
            </div>
            <div>
              <StarRating rating={Math.round(data.average_rating)} size="sm" />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {data.total} {data.total === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Submission Form */}
      <div className="my-6 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
        {user ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Rate this service:
              </label>
              <div className="flex items-center gap-2">
                <StarRating rating={rating} interactive size="lg" onRatingChange={setRating} />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">
                  {rating} / 5 Stars
                </span>
              </div>
            </div>

            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a helpful review for your neighbors (service quality, cleanliness, speed)..."
                rows={3}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Review submitted successfully!</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Post Review'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-3 text-xs text-slate-600 dark:text-slate-400">
            <span>Please </span>
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Log in
            </Link>
            <span> to leave a review and star rating.</span>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading reviews...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            No reviews yet. Be the first to share your experience!
          </div>
        ) : (
          data.items.map((review) => {
            const isAuthor = user?.id === review.user_id;
            const isAdmin = user?.role === 'admin';

            return (
              <div
                key={review.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/80 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                      {(review.user?.name || 'User')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {review.user?.name || 'Local Resident'}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="sm" />
                    {(isAuthor || isAdmin) && (
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition p-1"
                        title="Delete review"
                        aria-label="Delete review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-9">
                    {review.comment}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
