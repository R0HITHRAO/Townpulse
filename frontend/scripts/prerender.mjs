/**
 * Pre-render static HTML for every public route.
 *
 *   npm run generate:prerender
 *
 * Why this exists
 * ---------------
 * AUDIT.md 1.1 rated "blank page without JavaScript" a P0. Every route renders
 * client-side, so a crawler, a failed bundle load, or a visitor with JavaScript
 * disabled saw an empty `<div id="root">`. That is unacceptable for an audience
 * looking for a clinic number in a hurry, often on a weak connection.
 *
 * What this does
 * --------------
 * After `vite build`, for each public route it reads the built `dist/index.html`
 * and writes a route-specific copy containing:
 *   - per-route title, description, canonical, og:*, twitter:*
 *   - per-route JSON-LD (WebSite / CollectionPage / LocalBusiness / WebPage)
 *   - a real static body: town identity, emergency numbers, and the directory as
 *     plain `<a>` links
 *
 * The static body is what a crawler indexes and what a no-JS visitor reads.
 * React still mounts into `#root` and replaces it, so nothing is duplicated in
 * the DOM: `createRoot` clears the container. Content first, interactivity
 * second.
 *
 * Deliberately NOT done: running the real React tree through `renderToString`.
 * That needs data-fetch stubs for every page and couples the build to component
 * internals. Static HTML for the content that matters, plus the `<noscript>`
 * block in `index.html`, closes the P0 without that coupling.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('dist/index.html not found — run `vite build` first.');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(resolve(root, 'src/config/site.defaults.json'), 'utf8'));
const siteUrl = (process.env.VITE_SITE_URL || cfg.site.url).replace(/\/$/, '');
const townLabel = `${cfg.town.name}, ${cfg.town.region}`;

const template = readFileSync(resolve(dist, 'index.html'), 'utf8');

const snapshotPath = resolve(root, 'public/data/listings.json');
const snapshot = existsSync(snapshotPath)
  ? JSON.parse(readFileSync(snapshotPath, 'utf8'))
  : { categories: [], listings: [] };

/** Escape for HTML text and attribute values. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const abs = (p) => `${siteUrl}${p === '/' ? '/' : p}`;

/**
 * Rewrite the head tags for one route.
 *
 * The whole head block is replaced wholesale rather than patched, so the output
 * has exactly one canonical and one og:image instead of duplicates accumulating
 * across builds.
 */
function head({ title, description, path, ogKey = 'home', ogType = 'website', jsonLd }) {
  const url = abs(path);
  const ogImage = abs(`/og/${ogKey}.png`);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="TownPulse" />`,
    `<meta property="og:image" content="${esc(ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(ogImage)}" />`,
    ...['en', 'hi', 'kn'].map((code) => `<link rel="alternate" hreflang="${code}" href="${esc(url)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${esc(url)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n    ');
}
/** The static body written into `#root`. */
function body({ heading, intro = '', sections = [] }) {
  return `<div class="tp-prerender">
      <h1>${esc(heading)}</h1>
      ${intro ? `<p>${esc(intro)}</p>` : ''}
      ${sections.join('\n      ')}
    </div>`;
}

/**
 * Human labels for the emergency contacts.
 *
 * Deriving these from the i18n key produced "Tollfree" and "Women", which read
 * like internal identifiers on the one page where clarity matters most.
 */
const EMERGENCY_LABELS = {
  ambulance: 'Ambulance',
  police: 'Police',
  fire: 'Fire',
  women: 'Women & child helpline',
  child: 'Child helpline',
  tollfree: 'Emergency (all)',
};

/**
 * Emergency table, rendered on every page. Numbers we have no citable source
 * for say "Not yet collected" rather than showing a plausible-looking guess.
 */
function emergencySection() {
  const rows = cfg.emergencyContacts
    .map((c) => {
      const label = EMERGENCY_LABELS[c.id] ?? c.labelKey.split('.').pop();
      return c.phone
        ? `<tr><th scope="row">${esc(label)}</th><td><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></td></tr>`
        : `<tr><th scope="row">${esc(label)}</th><td><em>Not yet collected</em></td></tr>`;
    })
    .join('');
  return `<section>
        <h2>Emergency numbers</h2>
        <table><tbody>${rows}</tbody></table>
      </section>`;
}

/** Plain links to every category. */
function categorySection() {
  const items = (snapshot.categories ?? [])
    .map((c) => `<li><a href="/c/${esc(c.slug)}">${esc(c.name)}</a></li>`)
    .join('');
  return `<section>
        <h2>Browse by category</h2>
        <ul>${items}</ul>
      </section>`;
}

/** Static links to real listings, so the directory itself is crawlable. */
function listingSection(limit = 40) {
  const items = (snapshot.listings ?? [])
    .slice(0, limit)
    .map(
      (l) =>
        `<li><a href="/listings/${esc(l.id)}">${esc(l.name)}</a> — ${esc(
          l.category?.name ?? 'Local service'
        )}${l.verified ? '' : ' (not yet verified)'}</li>`
    )
    .join('');
  return `<section>
        <h2>Directory</h2>
        <ul>${items}</ul>
      </section>`;
}
const routes = [];

routes.push({
  out: 'index.html',
  head: head({
    title: `${cfg.site.tagline} | TownPulse`,
    description: `A community directory of local services in ${townLabel} — clinics, mechanics, shops, civic offices and emergency numbers, with the source and date shown for every entry.`,
    path: '/',
    ogKey: 'home',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TownPulse',
      url: siteUrl,
      description: `Community directory for ${townLabel}.`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  }),
  body: body({
    heading: cfg.site.tagline,
    intro: `Clinics, mechanics, food, shelter and civic offices in ${townLabel} — with the source and the date checked for every entry.`,
    sections: [emergencySection(), categorySection(), listingSection()],
  }),
});

routes.push({
  out: 'emergency/index.html',
  head: head({
    title: `Emergency numbers in ${cfg.town.name} — TownPulse`,
    description: `Police, fire, ambulance and helpline numbers for ${townLabel} and the surrounding area.`,
    path: cfg.routes.emergency,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Emergency numbers in ${cfg.town.name}`,
      url: abs(cfg.routes.emergency),
      about: { '@type': 'Place', name: townLabel },
    },
  }),
  body: body({
    heading: `Emergency numbers in ${townLabel}`,
    intro:
      'Numbers we cannot source from a published record are marked "not yet collected" rather than guessed.',
    sections: [emergencySection()],
  }),
});

routes.push({
  out: 'categories/index.html',
  head: head({
    title: `All categories — local services in ${cfg.town.name} | TownPulse`,
    description: `Browse every category in the ${townLabel} community directory.`,
    path: cfg.routes.categories,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Categories in ${cfg.town.name}`,
      url: abs(cfg.routes.categories),
    },
  }),
  body: body({ heading: `Categories in ${townLabel}`, sections: [categorySection()] }),
});

for (const cat of snapshot.categories ?? []) {
  routes.push({
    out: `c/${cat.slug}/index.html`,
    head: head({
      title: `${cat.name} in ${cfg.town.name} — TownPulse`,
      description: `${cat.name} listings in ${townLabel}, with source and last-checked date on each one.`,
      path: `/c/${cat.slug}`,
      ogKey: `category-${cat.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${cat.name} in ${cfg.town.name}`,
        url: abs(`/c/${cat.slug}`),
        about: { '@type': 'Place', name: townLabel },
      },
    }),
    body: body({
      heading: `${cat.name} in ${townLabel}`,
      intro: cat.description ?? '',
      sections: [listingSection(25)],
    }),
  });
}

for (const l of snapshot.listings ?? []) {
  const detail =
    l.phone ||
    (l.address && l.address !== 'Address not listed' ? l.address : 'No phone number listed yet');
  routes.push({
    out: `listings/${l.id}/index.html`,
    head: head({
      title: `${l.name}, ${cfg.town.name} — address, phone & hours | TownPulse`,
      description: `${l.name} in ${townLabel}: ${detail}. ${
        l.verified ? 'Recently verified.' : 'Not yet verified — check before you travel.'
      }`,
      path: `/listings/${l.id}`,
      ogKey: `listing-${l.id}`,
      ogType: 'place',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: l.name,
        url: abs(`/listings/${l.id}`),
        address: {
          '@type': 'PostalAddress',
          streetAddress: l.address,
          addressLocality: cfg.town.name,
          addressRegion: cfg.town.region,
          addressCountry: 'IN',
        },
        geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng },
        areaServed: { '@type': 'City', name: townLabel },
        ...(l.phone ? { telephone: l.phone } : {}),
        ...(l.source_url ? { sameAs: l.source_url } : {}),
      },
    }),
    body: body({
      heading: l.name,
      intro: `${l.category?.name ?? 'Local service'} — ${detail}`,
      sections: [emergencySection()],
    }),
  });
}

/**
 * The real `#root` container, with balanced `</div>` handling.
 *
 * Two traps here, both hit in practice:
 *
 *  1. The HTML comment in `index.html` *mentions* `<div id="root">`. Any pattern
 *     matching the bare attribute therefore matches the prose before the real
 *     element, so the pattern is anchored to the exact class list vite emits.
 *  2. The body contains nested `<div>`s, so a lazy match stops at the first
 *     inner close. Instead of one regex we scan forward and track nesting depth,
 *     which finds the true end regardless of depth.
 *
 * Returns null when the container is absent, so the caller can fail loudly
 * rather than silently writing a page with no content.
 */
function findRoot(html) {
  const open = '<div id="root" class="min-h-screen flex flex-col">';
  const start = html.indexOf(open);
  if (start === -1) return null;

  const cursor = start + open.length;
  let depth = 1;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = cursor;

  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === '<div' ? 1 : -1;
    if (depth === 0) {
      return { start, end: re.lastIndex };
    }
  }
  return null;
}

/**
 * Splice per-route head and body into the built template.
 *
 * The SEO head region is bounded by the `SEO:START` / `SEO:END` markers rather
 * than inferred from tag order. The original search-for-<title>-and-last-
 * `</script>` approach silently produced duplicate tags, because in
 * `index.html` the <title> sits *after* the JSON-LD blocks, so the computed
 * end index preceded the start index and the middle of the head was re-emitted.
 */
function render(route) {
  let html = template;

  const startMarker = '<!-- SEO:START -->';
  const endMarker = '<!-- SEO:END -->';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);

  if (start === -1 || end === -1) {
    throw new Error(
      'SEO:START / SEO:END markers not found in dist/index.html — index.html changed shape?'
    );
  }

  html =
    html.slice(0, start + startMarker.length) +
    `\n    ${route.head}\n    ` +
    html.slice(end);

  const root = findRoot(html);
  if (!root) {
    throw new Error('root container not found in dist/index.html — template changed?');
  }
  html =
    html.slice(0, root.start) +
    `<div id="root" class="min-h-screen flex flex-col">${route.body}</div>` +
    html.slice(root.end);

  return html;
}

let written = 0;
for (const route of routes) {
  const target = resolve(dist, route.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, render(route));
  written += 1;
}

console.log(`\n  ${written} static HTML files pre-rendered into dist/`);
console.log('  (crawlable content + noscript fallback, no JS required)\n');
