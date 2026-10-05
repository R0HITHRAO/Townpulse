import { describe, it, expect, beforeEach } from 'vitest';
import { applySeo, absoluteUrl, listingJsonLd } from '../hooks/useSeo';
import { site, town } from '../config/site';

const meta = (selector: string) =>
  document.querySelector<HTMLMetaElement>(selector)?.getAttribute('content');

describe('applySeo', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('sets the document title', () => {
    applySeo({ title: 'Health & clinics in Hampi', description: 'x', path: '/c/healthcare' });
    expect(document.title).toBe('Health & clinics in Hampi');
  });

  it('emits exactly one canonical, derived from site.url', () => {
    applySeo({ title: 'T', description: 'd', path: '/c/food' });
    const links = document.querySelectorAll('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(`${site.url}/c/food`);
  });

  it('does not accumulate duplicate og:title tags across routes', () => {
    applySeo({ title: 'First', description: 'd', path: '/' });
    applySeo({ title: 'Second', description: 'd', path: '/about' });
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(meta('meta[property="og:title"]')).toBe('Second');
  });

  it('emits twitter card tags', () => {
    applySeo({ title: 'T', description: 'd', path: '/' });
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta('meta[name="twitter:title"]')).toBe('T');
  });

  it('emits one hreflang alternate per supported language plus x-default', () => {
    applySeo({ title: 'T', description: 'd', path: '/about' });
    const alts = document.querySelectorAll('link[rel="alternate"]');
    expect(alts).toHaveLength(4); // en, hi, kn, x-default
    expect(
      document.querySelector('link[rel="alternate"][hreflang="kn"]')?.getAttribute('href')
    ).toBe(`${site.url}/about`);
  });

  it('removes stale hreflang alternates when the route changes', () => {
    applySeo({ title: 'T', description: 'd', path: '/about' });
    applySeo({ title: 'T', description: 'd', path: '/privacy' });
    const alts = document.querySelectorAll('link[rel="alternate"]');
    expect(alts).toHaveLength(4);
    expect(alts[0].getAttribute('href')).toBe(`${site.url}/privacy`);
  });

  it('writes default WebPage JSON-LD when none is supplied', () => {
    applySeo({ title: 'T', description: 'd', path: '/about' });
    const el = document.getElementById('tp-jsonld');
    const data = JSON.parse(el?.textContent ?? '{}');
    expect(data['@type']).toBe('WebPage');
    expect(data.about.name).toContain(town.name);
  });

  it('uses the supplied JSON-LD instead of the default', () => {
    const custom = { '@type': 'CollectionPage' };
    applySeo({ title: 'T', description: 'd', path: '/c/food', jsonLd: custom });
    const data = JSON.parse(document.getElementById('tp-jsonld')?.textContent ?? '{}');
    expect(data['@type']).toBe('CollectionPage');
  });
});

describe('absoluteUrl', () => {
  it('prefixes a relative path with the site origin', () => {
    expect(absoluteUrl('/about')).toBe(`${site.url}/about`);
  });

  it('leaves an absolute URL untouched', () => {
    expect(absoluteUrl('https://example.org/x')).toBe('https://example.org/x');
  });
});

describe('listingJsonLd', () => {
  it('emits LocalBusiness markup with geo and town', () => {
    const data = listingJsonLd({
      id: 'osm-1',
      name: 'Hampi Clinic',
      address: 'Main Road',
      lat: 15.3,
      lng: 76.4,
      phone: '+91 12345 67890',
    }) as Record<string, unknown>;

    expect(data['@type']).toBe('LocalBusiness');
    expect(data.name).toBe('Hampi Clinic');
    expect((data.geo as Record<string, unknown>).latitude).toBe(15.3);
    expect(data.telephone).toBe('+91 12345 67890');
    expect((data.address as Record<string, unknown>).addressLocality).toBe(town.name);
  });

  it('omits telephone rather than inventing one', () => {
    const data = listingJsonLd({ id: 'osm-2', name: 'No Phone Shop' }) as Record<string, unknown>;
    expect(data.telephone).toBeUndefined();
  });
});
