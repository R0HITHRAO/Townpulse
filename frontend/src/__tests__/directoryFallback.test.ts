import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * The offline snapshot is what a static deployment (Vercel, no backend) actually
 * serves, so its search contract has to be right.
 *
 * `available` distinguishes a usable snapshot for the configured area from an
 * ordinary empty result. A snapshot for a different area is not a valid
 * fallback, even when it can be read successfully.
 */

const TOWN = { lat: 20, lng: 0 };

/** `near` sits ~15 m from the configured centre; `far` sits ~1.5 km away. */
const snapshotPayload = {
  generated_from: 'OpenStreetMap',
  attribution: '© OpenStreetMap contributors',
  town: { name: 'Your area', region: '', district: '', ...TOWN },
  categories: [{ id: 1, name: 'Healthcare', slug: 'healthcare' }],
  listings: [
    {
      id: 'near',
      name: 'Central Health Centre',
      address: 'Central Avenue',
      category_id: 1,
      category: { id: 1, name: 'Healthcare', slug: 'healthcare' },
      lat: 20.0001,
      lng: 0.0001,
      verified: true,
      status: 'approved',
    },
    {
      id: 'far',
      name: 'Kamalapur Clinic',
      address: 'Station Road',
      category_id: 1,
      category: { id: 1, name: 'Healthcare', slug: 'healthcare' },
      lat: 20.01,
      lng: 0.01,
      verified: false,
      status: 'approved',
    },
  ],
};

const okFetch = (payload = snapshotPayload) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => payload }));

/**
 * `loadDirectorySnapshot` memoises its promise at module scope, so each test
 * needs a fresh module instance to observe a different fetch outcome.
 */
function importFresh(fetchImpl: unknown) {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchImpl);
  return import('../services/directoryFallback');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('searchSnapshot (offline directory contract)', () => {
  it('reads the bundled snapshot and attaches distances', async () => {
    const { searchSnapshot } = await importFresh(okFetch());

    const res = await searchSnapshot({ lat: TOWN.lat, lng: TOWN.lng, radius: 5000 });

    expect(res.available).toBe(true);
    expect(res.total).toBe(2);
    expect(res.items.map((l) => l.id).sort()).toEqual(['far', 'near']);

    const nearDistance = res.items.find((l) => l.id === 'near')?.distance_meters ?? -1;
    expect(nearDistance).toBeGreaterThanOrEqual(0);
    expect(nearDistance).toBeLessThan(100);
  });

  it('applies the radius around the supplied origin', async () => {
    const { searchSnapshot } = await importFresh(okFetch());

    const narrow = await searchSnapshot({ lat: TOWN.lat, lng: TOWN.lng, radius: 1000 });
    expect(narrow.available).toBe(true);
    expect(narrow.items.map((l) => l.id)).toEqual(['near']);

    const wide = await searchSnapshot({ lat: TOWN.lat, lng: TOWN.lng, radius: 15000 });
    expect(wide.total).toBe(2);
  });

  it('reports available:true, not a failure, when the filter matches nothing', async () => {
    const { searchSnapshot } = await importFresh(okFetch());

    const res = await searchSnapshot({ q: 'no-such-service-xyz' });

    expect(res.available).toBe(true);
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });

  it('reports available:false when the snapshot cannot be fetched at all', async () => {
    const failing = vi.fn(async () => {
      throw new Error('network down');
    });
    const { searchSnapshot } = await importFresh(failing);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await searchSnapshot({ radius: 15000 });

    expect(res.available).toBe(false);
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });

  it('does not use a saved snapshot for a different area', async () => {
    const otherArea = {
      ...snapshotPayload,
      town: { ...snapshotPayload.town, name: 'Another area' },
    };
    const { searchSnapshot } = await importFresh(okFetch(otherArea));

    const res = await searchSnapshot({});

    expect(res.available).toBe(false);
    expect(res.items).toEqual([]);
  });

  it('reports available:false when the snapshot responds with a non-ok status', async () => {
    const notFound = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    const { searchSnapshot } = await importFresh(notFound);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await searchSnapshot({});

    expect(res.available).toBe(false);
    expect(res.items).toEqual([]);
  });

  it('filters by category slug as well as by numeric id', async () => {
    const { searchSnapshot } = await importFresh(okFetch());

    const bySlug = await searchSnapshot({ category_id: 'healthcare' as unknown as number });
    expect(bySlug.total).toBe(2);

    const byId = await searchSnapshot({ category_id: 1 });
    expect(byId.total).toBe(2);
  });

  it('honours verified_only', async () => {
    const { searchSnapshot } = await importFresh(okFetch());

    const res = await searchSnapshot({ verified_only: true });

    expect(res.items.map((l) => l.id)).toEqual(['near']);
  });
});
