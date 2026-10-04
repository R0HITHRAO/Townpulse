import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ListingCard } from '../components/ListingCard';
import { BookmarkProvider } from '../context/BookmarkContext';
import { Listing } from '../services/api';

const mockListing: Listing = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Town Central Clinic',
  description: 'Primary medical emergency care',
  address: '14 Main St, Town Center',
  phone: '+919845012345',
  verified: true,
  status: 'approved',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  category: { id: 1, name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
};

describe('ListingCard Component', () => {
  it('renders listing name, category, and address', () => {
    render(
      <BookmarkProvider>
        <BrowserRouter>
          <ListingCard listing={mockListing} />
        </BrowserRouter>
      </BookmarkProvider>
    );

    expect(screen.getByText('Town Central Clinic')).toBeInTheDocument();
    expect(screen.getByText(/Healthcare/)).toBeInTheDocument();
    expect(screen.getByText('14 Main St, Town Center')).toBeInTheDocument();
  });

  it('displays verified badge when verified is true', () => {
    render(
      <BookmarkProvider>
        <BrowserRouter>
          <ListingCard listing={mockListing} />
        </BrowserRouter>
      </BookmarkProvider>
    );

    expect(screen.getByText('verified')).toBeInTheDocument();
  });

  it('renders telephone call button with phone link', () => {
    render(
      <BookmarkProvider>
        <BrowserRouter>
          <ListingCard listing={mockListing} />
        </BrowserRouter>
      </BookmarkProvider>
    );

    const callLink = screen.getByLabelText('Call Town Central Clinic');
    expect(callLink).toHaveAttribute('href', 'tel:+919845012345');
  });

  it('links the category chip to its shareable category page', () => {
    render(
      <BookmarkProvider>
        <BrowserRouter>
          <ListingCard listing={mockListing} />
        </BrowserRouter>
      </BookmarkProvider>
    );

    expect(screen.getByText(/Healthcare/).closest('a')).toHaveAttribute('href', '/c/healthcare');
  });

  it('exposes bookmark state through aria-pressed and a state-specific label', () => {
    render(
      <BookmarkProvider>
        <BrowserRouter>
          <ListingCard listing={mockListing} />
        </BrowserRouter>
      </BookmarkProvider>
    );

    const bookmark = screen.getByLabelText(/saved places/i);
    expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  });
});
