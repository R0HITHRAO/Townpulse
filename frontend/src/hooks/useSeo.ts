/**
 * TownPulse head management
 * =========================
 *
 * One module owns every head tag the site emits. Previously `useSeo` set only
 * `title` and `description`, so every route shared the homepage's social
 * preview and no route declared a canonical URL (AUDIT.md 5.2, 5.4, 5.5, 5.6).
 *
 * What is emitted per route:
 *   - `<title>`, `meta description`
 *   - `<link rel="canonical">` — derived from one `site.url`, never hand-typed
 *   - `og:title/description/type/url/image`, `og:site_name`, `og:locale`
 *   - `twitter:card/title/description/image`
 *   - `hreflang` alternates for every registered language
 *   - JSON-LD: a per-listing `LocalBusiness`, or a `WebPage` elsewhere
 *
 * The OG image path comes from `public/og/manifest.json`, written by
 * `scripts/generate-og.mjs`. It is loaded once and cached; if it is missing the
 * component degrades to the homepage card rather than emitting a broken
 * `og:image`.
 */

import { useEffect } from 'react';
import { site } from '../config/site';
// Imported from `i18n/languages` rather than `i18n`: the latter calls
// `i18n.use(initReactI18next).init(...)` at module load, which breaks tests
// that partially mock `react-i18next`.
import { SUPPORTED_LANGUAGES } from '../i18n/languages';

type OgManifest = Record<string, string>;

let ogManifest: OgManifest | null = null;
let ogManifestLoaded = false;

/** Fetch the generated OG manifest once, tolerating its absence. */
function loadOgManifest(): Promise<OgManifest> {
  if (ogManifestLoaded) return Promise.resolve(ogManifest ?? {});
  ogManifestLoaded = true;
  return fetch(`${import.meta.env.BASE_URL}og/manifest.json`)
    .then((res) => (res.ok ? (res.json() as Promise<OgManifest>) : {}))
    .catch(() => ({}))
    .then((data) => {
      ogManifest = data ?? {};
      return ogManifest;
    });
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Create-or-update a `<link>` in head, keyed by `data-k` when supplied. */
function upsertLink(rel: string, key: string, attrs: Record<string, string>): void {
  const selector = `link[rel="${rel}"]${key ? `[data-k="${key}"]` : ''}`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (key) el.setAttribute('data-k', key);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

/** Absolute URL for a route path, used for canonicals and og:url. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Replace the JSON-LD block with `data`. */
function setJsonLd(data: unknown): void {
  const id = 'tp-jsonld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export interface SeoOptions {
  title: string;
  description: string;
  /** Path of this route, used for canonical, og:url and hreflang. */
  path: string;
  /** Manifest key, e.g. `listing-osm-n3c45x` or `category-healthcare`. */
  ogKey?: string;
  ogType?: 'website' | 'article' | 'place';
  /** Suppress JSON-LD where a page already emits its own. */
  jsonLd?: unknown;
}
export function applySeo({
  title,
  description,
  path,
  ogKey,
  ogType = 'website',
  jsonLd,
}: SeoOptions): void {
  document.title = title;
  const url = absoluteUrl(path);

  upsertMeta('name', 'description', description);
  upsertLink('canonical', '', { href: url });

  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:site_name', site.name);
  upsertMeta('property', 'og:locale', site.locale);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);

  // Clear stale alternates before rewriting, otherwise navigating between
  // routes would leave the previous route's hreflang set in place.
  for (const el of Array.from(document.querySelectorAll('link[rel="alternate"][data-k]'))) {
    el.remove();
  }
  for (const lang of SUPPORTED_LANGUAGES) {
    upsertLink('alternate', lang.code, { hreflang: lang.code, href: url });
  }
  upsertLink('alternate', 'x-default', { hreflang: 'x-default', href: url });

  void loadOgManifest().then((manifest) => {
    const image = absoluteUrl(manifest[ogKey ?? 'home'] ?? manifest.home ?? '/og/home.png');
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('name', 'twitter:image', image);
  });

  setJsonLd(
    jsonLd ?? {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url,
      isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
      about: { '@type': 'Place', name: 'Local services' },
    }
  );
}

/**
 * `LocalBusiness` structured data for one listing. Included because these are
 * the entities people actually search for, and structured data is the only
 * place the town and the source become machine-readable.
 */
export function listingJsonLd(listing: {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  website?: string | null;
  sourceUrl?: string | null;
  /** Friendly name of the place the listing belongs to (a town/city the
   * operator recorded when the record was created). Falls back to a neutral
   * label instead of inventing a town. */
  areaName?: string;
}): unknown {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.name,
    '@id': absoluteUrl(`/listings/${listing.id}`),
    url: absoluteUrl(`/listings/${listing.id}`),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.areaName ?? 'Your town',
      addressRegion: '',
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: listing.lat, longitude: listing.lng },
    areaServed: { '@type': 'City', name: listing.areaName ?? 'Your town' },
    ...(listing.phone ? { telephone: listing.phone } : {}),
    ...(listing.website ? { url: listing.website } : {}),
    ...(listing.sourceUrl ? { sameAs: listing.sourceUrl } : {}),
  };
}

/**
 * Route-level SEO hook.
 *
 * Accepts either the new options object or the legacy `(title, description)`
 * pair, so pages can be migrated one at a time without breaking the build.
 */
export function useSeo(titleOrOptions: string | SeoOptions, description?: string): void {
  const options: SeoOptions =
    typeof titleOrOptions === 'string'
      ? {
          title: titleOrOptions,
          description: description ?? site.description,
          path: typeof window === 'undefined' ? '/' : window.location.pathname,
        }
      : titleOrOptions;

  const { title, description: desc, path, ogKey, ogType, jsonLd } = options;
  // Serialised so a structurally identical object does not re-run the effect.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    applySeo({
      title,
      description: desc,
      path,
      ogKey,
      ogType,
      jsonLd: jsonLd ? JSON.parse(jsonLdKey) : undefined,
    });
  }, [title, desc, path, ogKey, ogType, jsonLdKey]);
}

export default useSeo;
