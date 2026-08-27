import React, { createContext, useContext, useState, useEffect } from 'react';
import { Listing } from '../services/api';

interface BookmarkContextType {
  bookmarks: Listing[];
  isBookmarked: (listingId: string) => boolean;
  toggleBookmark: (listing: Listing) => void;
  clearBookmarks: () => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const STORAGE_KEY = 'townpulse_saved_bookmarks';

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Listing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Failed to persist bookmarks to localStorage', e);
    }
  }, [bookmarks]);

  const isBookmarked = (listingId: string): boolean => {
    return bookmarks.some((b) => b.id === listingId);
  };

  const toggleBookmark = (listing: Listing) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === listing.id);
      if (exists) {
        return prev.filter((b) => b.id !== listing.id);
      } else {
        return [listing, ...prev];
      }
    });
  };

  const clearBookmarks = () => {
    setBookmarks([]);
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        isBookmarked,
        toggleBookmark,
        clearBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = (): BookmarkContextType => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};
