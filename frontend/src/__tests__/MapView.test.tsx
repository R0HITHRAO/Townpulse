import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapView } from '../pages/MapView';
import { api, type Listing } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';

const mockLocation = vi.hoisted(() => ({
  name: 'Sample location',
  region: '',
  country: '',
  lat: 0.335,
  lng: 0.462,
}));

vi.mock('../context/LocationContext', () => ({
  useCurrentLocation: () => ({
    location: mockLocation,
    requestLocation: vi.fn(),
    setLocation: vi.fn(),
    clearLocation: vi.fn(),
    isLocating: false,
  }),
}));

vi.mock('../components/Map', () => ({
  Map: ({ className }: { className?: string }) => (
    <div data-testid="directory-map" className={className} />
  ),
}));

vi.mock('../components/ListingCard', () => ({
  ListingCard: ({ listing }: { listing: Listing }) => <div>{listing.name}</div>,
}));

vi.mock('../components/CategoryChips', () => ({
  CategoryChips: () => null,
}));

vi.mock('../components/Reveal', () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

describe('MapView empty offline results', () => {
  beforeEach(() => {
    vi.mocked(api.getCategories).mockResolvedValue([]);
    vi.mocked(api.searchListings).mockRejectedValue(new Error('backend unavailable'));
    vi.mocked(loadSnapshotCategories).mockResolvedValue([]);
    vi.mocked(searchSnapshot).mockResolvedValue({
      available: true,
      directoryCount: 170,
      items: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 1,
      distances: new Map(),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explains that saved listings do not cover the selected location and links to Google Earth', async () => {
    render(<MapView />);

    expect(
      await screen.findByText(/saved directory has no listings near this location/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/using saved directory data/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/python scripts\/import_osm\.py/i)
    ).not.toBeInTheDocument();

    expect(screen.getByTestId('directory-map')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /google earth/i })).toHaveAttribute(
      'href',
      'https://earth.google.com/web/search/0.335,0.462'
    );
  });

  it('gives full map mode an explicit height so Leaflet can render', async () => {
    render(<MapView />);

    await screen.findByText(/saved directory has no listings near this location/i);
    fireEvent.click(screen.getByTitle('Map View'));

    const map = screen.getByTestId('directory-map');
    expect(map).toHaveClass('h-full');
    expect(map.parentElement).toHaveClass('h-[calc(100vh-9rem)]');
  });

  it('lets visitors browse directory listings outside their current radius', async () => {
    const listing: Listing = {
      id: 'town-listing',
      name: 'Town Clinic',
      address: 'Market Street',
      verified: false,
      status: 'approved',
    };
    vi.mocked(api.searchListings).mockImplementation(async (params) => {
      const items = params.lat === undefined ? [listing] : [];
      return {
        items,
        total: items.length,
        page: 1,
        per_page: 100,
        total_pages: 1,
      };
    });

    render(<MapView />);
    await screen.findByText('No services found in this search area.');
    fireEvent.click(screen.getByRole('button', { name: 'Browse all locations' }));

    expect(await screen.findByText('Town Clinic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Near my location' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List (1)' })).toBeInTheDocument();
    const calls = vi.mocked(api.searchListings).mock.calls;
    const lastSearch = calls[calls.length - 1]?.[0];
    expect(lastSearch).not.toHaveProperty('lat');
    expect(lastSearch).not.toHaveProperty('lng');
    expect(lastSearch).not.toHaveProperty('radius');
  });
});
