import React from 'react';
import { useBookmarks } from '../context/BookmarkContext';
import { Link } from 'react-router-dom';
import { Bookmark, X, Phone, Navigation, Trash2, ExternalLink } from 'lucide-react';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({ isOpen, onClose }) => {
  const { bookmarks, toggleBookmark, clearBookmarks } = useBookmarks();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-scale-in max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-rose-600 dark:fill-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                My Saved Places ({bookmarks.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quick access to your neighborhood emergency contacts & doctors
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-2 pr-1">
          {bookmarks.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No saved places yet.
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Tap the heart/bookmark icon on any clinic, pharmacy, or service to pin it here for 1-tap quick calling.
              </p>
            </div>
          ) : (
            bookmarks.map((listing) => (
              <div
                key={listing.id}
                className="py-3 flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/listings/${listing.id}`}
                    onClick={onClose}
                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate block"
                  >
                    {listing.name}
                  </Link>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {listing.category?.name || 'Local Service'} • {listing.address}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {listing.phone && (
                    <a
                      href={`tel:${listing.phone}`}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition hover:scale-105"
                      title={`Call ${listing.phone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {listing.lat && listing.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition hover:scale-105"
                      title="Directions"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => toggleBookmark(listing)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Remove from saved places"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        {bookmarks.length > 0 && (
          <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={clearBookmarks}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
            >
              Clear All Saved Places
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
