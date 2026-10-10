/**
 * Generate the static directory snapshot served from `public/data/`.
 *
 *   npm run sync:directory
 *
 * Why this exists
 * ---------------
 * The frontend is frequently deployed (Vercel) without a reachable backend,
 * or opened while the backend is down. In that state every page showed
 * "Could not load services" and the visitor got nothing at all — for a site
 * whose whole purpose is being useful in an emergency, that is the worst
 * possible failure mode.
 *
 * So the same real OpenStreetMap records that seed the database are also
 * emitted as a static JSON file that ships with the frontend. When the API is
 * unreachable the app renders this snapshot and says clearly that it is
 * offline data.
 *
 * The snapshot is *real* data — same source, same records, still marked
 * unverified. It is a fallback, not a substitute for the API.
 *
 * Reads: ../backend/seed/osm_seed.json (falls back to hampi_osm.json)
 * Writes: public/data/listings.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(here, '../../backend/seed');
// `osm_seed.json` is what `build_seed_from_osm.py` writes for any place;
// `hampi_osm.json` is the older named extract, kept as a fallback.
const seedCandidates = [
  path.resolve(seedDir, 'osm_seed.json'),
  path.resolve(seedDir, 'hampi_osm.json'),
];
const seedPath = seedCandidates.find((p) => fs.existsSync(p));
const outPath = path.resolve(here, '../public/data/listings.json');

if (!seedPath) {
  console.error(`No seed file found. Looked for:`);
  for (const p of seedCandidates) console.error(`  ${p}`);
  console.error('Generate one for any place first:');
  console.error('  python scripts/import_osm.py --lat <LAT> --lng <LNG>');
  console.error('  python scripts/build_seed_from_osm.py seed/_osm_raw.json --name "Your town"');
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Deterministic id so the snapshot and the database agree on identity.
function stableId(osmId) {
  const slug = String(osmId).replace(/[^a-zA-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return `osm-${hash.toString(36)}`;
}

// Categories keep numeric ids so every existing consumer (chips, filters,
// forms) keeps working unchanged; the slug travels alongside for URLs.
const categories = seed.categories.map((c, index) => ({
  id: index + 1,
  name: c.name,
  slug: c.slug,
  description: c.description,
}));

const bySlug = new Map(categories.map((c) => [c.slug, c]));

const listings = seed.listings
  .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number')
  .map((l) => {
    const cat = bySlug.get(l.category);
    return {
      id: stableId(l.osm_id),
      osm_id: l.osm_id,
      name: l.name,
      name_local: l.name_local || null,
      description: l.description || null,
      address: l.address,
      lat: l.lat,
      lng: l.lng,
      distance_meters: l.distance_meters ?? null,
      phone: l.phone || null,
      email: l.email || null,
      website: l.website || null,
      hours: l.hours && Object.keys(l.hours).length ? l.hours : null,
      services: l.services ?? [],
      // Honesty: none of this has been checked by a human.
      verified: false,
      status: 'unverified',
      source: 'openstreetmap',
      source_url: l.source_url,
      category_id: cat ? cat.id : null,
      category: cat ?? null,
      created_at: null,
      updated_at: null,
      average_rating: null,
      review_count: 0,
    };
  });

const payload = {
  generated_from: `OpenStreetMap via ${path.basename(seedPath)}`,
  attribution:
    'Contains information from OpenStreetMap, available under the Open Database License (ODbL). (c) OpenStreetMap contributors.',
  town: seed.town,
  categories,
  listings,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8');

const kb = Math.round(fs.statSync(outPath).size / 1024);
console.log(`Wrote ${outPath}`);
console.log(`  town:      ${seed.town.name}, ${seed.town.region}`);
console.log(`  categories: ${categories.length}`);
console.log(`  listings:  ${listings.length}`);
console.log(`  size:      ${kb} KB`);
const withPhone = listings.filter((l) => l.phone).length;
console.log(`  with phone: ${withPhone}/${listings.length}`);