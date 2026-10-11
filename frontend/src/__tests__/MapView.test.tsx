import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapView } from '../pages/MapView';
import { api } from '../services/api';
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
  Map: () => <div data-testid="directory-map" />,
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
});
