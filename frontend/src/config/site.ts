/**
 * TownPulse site configuration
 * =============================
 *
 * The single source of truth for *where this directory is*. Everything that
 * needs to know the town's identity reads from here: the header, the hero, page
 * titles, canonical URLs, the sitemap, JSON-LD `areaServed`, and the backend's
 * map centre and timezone (mirrored in `backend/app/core/config.py`).
 *
 * ── Retargeting to your town ────────────────────────────────────────────────
 * 1. Change the values below. That alone updates the entire site.
 * 2. Set the same values in the backend `.env`:
 *      TOWN_NAME, TOWN_REGION, TOWN_LAT, TOWN_LNG, TZ_OFFSET_MINUTES
 * 3. Re-run the seed:  `python scripts/import_osm.py --lat <lat> --lng <lng>`
 * 4. Set VITE_SITE_URL in `.env` to your production domain (see README).
 *
 * Every field is overridable at build time via `import.meta.env`, so one source
 * tree can be deployed for several towns without a code change.
 */

const env = import.meta.env;

/** Read a build-time env override, falling back to the literal below. */
function setting(key: string, fallback: string): string {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function num(key: string, fallback: number): number {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const town = {
  /** Short name used throughout the UI: "Hampi". */
  name: setting('VITE_TOWN_NAME', 'Hampi'),
  /** State / province / region: "Karnataka". */
  region: setting('VITE_TOWN_REGION', 'Karnataka'),
  /** District, shown in page titles and structured data. */
  district: setting('VITE_TOWN_DISTRICT', 'Vijayanagara'),
  /** Map centre for the directory and the map view. */
  lat: num('VITE_TOWN_LAT', 15.335),
  lng: num('VITE_TOWN_LNG', 76.46),
  /** Default zoom and search radius in metres. */
  zoom: num('VITE_TOWN_ZOOM', 14),
  radiusMeters: num('VITE_TOWN_RADIUS_M', 6000),
  /** UTC offset in minutes — drives "open now" in the backend. */
  timezoneOffsetMinutes: num('VITE_TOWN_TZ_OFFSET', 330),
  /** IANA timezone, for display only. */
  timezone: setting('VITE_TOWN_TZ', 'Asia/Kolkata'),
} as const;

/** "Hampi, Karnataka" — used in prose, titles and structured data. */
export const townLabel = `${town.name}, ${town.region}`;

export const site = {
  /** Canonical origin. Must be set to the real domain in production. */
  url: setting('VITE_SITE_URL', 'https://hampi.townpulse.app').replace(/\/$/, ''),
  name: 'TownPulse',
  /** Wordmark suffix shown beside the name. */
  tagline: setting(
    'VITE_SITE_TAGLINE',
    'Find clinics, mechanics, shelter and food in your town'
  ),
  description: setting(
    'VITE_SITE_DESCRIPTION',
    `A community directory of local services in ${townLabel} — clinics, mechanics, shops, civic offices and emergency numbers, with the source and date shown for every entry.`
  ),
  locale: 'en_IN',
  themeColor: '#9a3412',
  themeColorDark: '#17120e',
  contactEmail: setting('VITE_CONTACT_EMAIL', 'hello@townpulse.app'),
  githubUrl: 'https://github.com/R0HITHRAO/Townpulse',
} as const;

/**
 * Emergency services.
 *
 * `phone` values are intentionally left empty for anything we cannot source
 * from a published, citable record. The Emergency page renders a "number not
 * yet collected" state with instructions for how to find it offline, rather
 * than showing a plausible-looking but invented number. Populate these from
 * your local administration — see DATA_NEEDED.md.
 */
export interface EmergencyContact {
  id: string;
  labelKey: string;
  /** Empty means "not yet collected" — never a guess. */
  phone: string;
  /** Alternative number when the primary is a station rather than a line. */
  altPhone?: string;
  noteKey?: string;
}

export const emergencyContacts: EmergencyContact[] = [
  { id: 'ambulance', labelKey: 'emergency.ambulance', phone: '' },
  { id: 'police', labelKey: 'emergency.police', phone: '100' },
  { id: 'fire', labelKey: 'emergency.fire', phone: '101' },
  { id: 'women', labelKey: 'emergency.women', phone: '1091' },
  { id: 'child', labelKey: 'emergency.child', phone: '1098' },
  { id: 'tollfree', labelKey: 'emergency.tollfree', phone: '112' },
];

/** Canonical routes that must exist, be linked in the footer, and enter the sitemap. */
export const routes = {
  home: '/',
  emergency: '/emergency',
  categories: '/categories',
  map: '/map',
  about: '/about',
  suggest: '/suggest',
  report: '/report',
  privacy: '/privacy',
  accessibility: '/accessibility',
  submit: '/submit',
} as const;

export const isProduction = env.PROD === true;

/**
 * Flagged by `src/lib/validate-config.ts` at build time in production. It is
 * not fatal — the site still works on a placeholder domain — but the build log
 * shouts about it and the README explains the one-line fix.
 */
export const configWarnings: string[] = [];

if (site.url.includes('townpulse.app')) {
  configWarnings.push(
    `VITE_SITE_URL is still the placeholder (${site.url}). ` +
      'Canonical URLs, sitemap and OG images will point at the wrong origin.'
  );
}
if (!emergencyContacts.some((c) => c.phone)) {
  configWarnings.push(
    'Most emergency numbers are empty. The Emergency page will show ' +
      '"number not yet collected" — see DATA_NEEDED.md.'
  );
}