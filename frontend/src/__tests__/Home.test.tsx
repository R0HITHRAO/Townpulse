import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Home } from '../pages/Home';
import { api, Category, Listing } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';
import { ThemeProvider } from '../context/ThemeContext';
import { BookmarkProvider } from '../context/BookmarkContext';
import { site } from '../config/site';

// The real module is kept so type exports and untouched helpers keep working;
// only the two network entry points Home drives are stubbed.
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getCategories: vi.fn(),
      searchListings: vi.fn(),
    },
  };
});

vi.mock('../services/directoryFallback', () => ({
  searchSnapshot: vi.fn(),
  loadSnapshotCategories: vi.fn(),
}));

const categories: Category[] = [
  { id: 1, name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
  { id: 2, name: 'Food', icon: '🍲', slug: 'food' },
];

const listing: Listing = {
  id: 'osm-1',
  name: 'Hampi Clinic',
  address: 'Krishna Bazaar, Hampi',
  verified: true,
  status: 'approved',
  lat: 15.335,
  lng: 76.46,
  phone: '+91 98765 43210',
  category: { id: 1, name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
};

const page = (items: Listing[]) => ({
  items,
  total: items.length,
  page: 1,
  per_page: 20,
  total_pages: 1,
});

const renderHome = () =>
  render(
    <ThemeProvider>
      <BookmarkProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </BookmarkProvider>
    </ThemeProvider>
  );

describe('Home page (directory regression suite)', () => {
  beforeEach(() => {
    // AnimatedBackground needs a 2D context jsdom does not implement.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    // Quietens React act(...) noise from background fetches in this suite.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    (api.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (api.searchListings as ReturnType<typeof vi.fn>).mockResolvedValue(page([listing]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the directory immediately with no intro gate blocking it', async () => {
    renderHome();

    // The hero, search and filters must be usable on first paint — the earlier
    // 3D redesign hid all of it behind a fake loading screen with an
    // "Enter 3D Webpage" button.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Search local services')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enter 3d webpage/i })).toBeNull();
    expect(screen.queryByText(/loading experience/i)).toBeNull();

    // Settle the initial data load inside this test so its async renders do
    // not leak into the next one.
    expect(await screen.findAllByRole('link', { name: /Hampi Clinic/ })).not.toHaveLength(0);
  });

  it('sets the homepage canonical URL through useSeo', async () => {
    renderHome();

    await waitFor(() => {
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      expect(canonical?.getAttribute('href')).toBe(`${site.url}/`);
    });
  });

  it('wires the hero search to the listings API', async () => {
    renderHome();
    await waitFor(() => expect(api.searchListings).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Search local services'), {
      target: { value: 'clinic' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(api.searchListings).toHaveBeenCalledWith(expect.objectContaining({ q: 'clinic' }));
    });
  });

  it('renders category chips that refetch listings when picked', async () => {
    renderHome();

    const chip = await screen.findByRole('button', { name: /Healthcare/ });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(api.searchListings).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: 1 })
      );
    });
  });

  it('renders listings as links to their detail pages', async () => {
    renderHome();

    const links = await screen.findAllByRole('link', { name: /Hampi Clinic/ });
    expect(links.some((a) => a.getAttribute('href') === '/listings/osm-1')).toBe(true);
  });

  it('falls back to the saved directory when the API is unreachable', async () => {
    (api.getCategories as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    (api.searchListings as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    (loadSnapshotCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (searchSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(page([listing]));

    renderHome();

    expect(await screen.findByText(/Showing saved directory data/i)).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: /Hampi Clinic/ })).not.toHaveLength(0);
  });
});
