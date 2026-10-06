/**
 * TownPulse site configuration
 * =============================
 *
 * The single source of truth for an optional local deployment. Without town
 * overrides, TownPulse starts as a global directory and uses the visitor's
 * chosen search location instead of assuming a particular town.
 *
 * ── Retargeting to your town ────────────────────────────────────────────────
 * 1. Set the values below for a town-specific deployment.
 * 2. Set the same values in the backend `.env`:
 *      TOWN_NAME, TOWN_REGION, TOWN_LAT, TOWN_LNG, TZ_OFFSET_MINUTES
 * 3. Re-run the seed:  `python scripts/import_osm.py --lat <lat> --lng <lng>`
 * 4. Set VITE_SITE_URL in `.env` to your production domain (see README).
 *
 * Every field is overridable at build time via `import.meta.env`, so one source
 * tree can be deployed for several towns without a code change.
 */

/**
 * Build scripts (`generate-og.mjs`, `generate-sitemap.mjs`, `prerender.mjs`) also
 * need the town identity, but they run in plain Node and cannot import this
 * module. The values therefore live in `site.defaults.json`, read by both sides,
 * so retargeting the site means editing one file.
 */
import defaults from './site.defaults.json';

const env = import.meta.env;

/** Read a build-time env override, falling back to the value in site.defaults.json. */
function setting(key: string, fallback: string): string {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function num(key: string, fallback: number): number {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function coordinate(key: string, fallback: number, min: number, max: number): number {
  const value = Number(env[key]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function signedNumber(key: string, fallback: number, min: number, max: number): number {
  const value = Number(env[key]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

export const town = {
  /** Optional area label for town-specific deployments. */
  name: setting('VITE_TOWN_NAME', defaults.town.name),
  /** State / province / region for town-specific deployments. */
  region: setting('VITE_TOWN_REGION', defaults.town.region),
  /** District, shown in page titles and structured data when configured. */
  district: setting('VITE_TOWN_DISTRICT', defaults.town.district),
  /** Neutral world-view fallback; location searches supply their own centre. */
  lat: coordinate('VITE_TOWN_LAT', defaults.town.lat, -90, 90),
  lng: coordinate('VITE_TOWN_LNG', defaults.town.lng, -180, 180),
  /** Default zoom and search radius in metres. */
  zoom: num('VITE_TOWN_ZOOM', defaults.town.zoom),
  radiusMeters: num('VITE_TOWN_RADIUS_M', defaults.town.radiusMeters),
  /** UTC offset in minutes — drives "open now" in the backend. */
  timezoneOffsetMinutes: signedNumber(
    'VITE_TOWN_TZ_OFFSET',
    defaults.town.timezoneOffsetMinutes,
    -840,
    840
  ),
  /** IANA timezone, for display only. */
  timezone: setting('VITE_TOWN_TZ', defaults.town.timezone),
} as const;

/** Location label for local deployments, with a generic global fallback. */
export const townLabel = town.region ? `${town.name}, ${town.region}` : town.name;

export const site = {
  /** Canonical origin. Must be set to the real domain in production. */
  url: setting('VITE_SITE_URL', defaults.site.url).replace(/\/$/, ''),
  name: 'TownPulse',
  /** Wordmark suffix shown beside the name. */
  tagline: setting('VITE_SITE_TAGLINE', defaults.site.tagline),
  description: setting(
    'VITE_SITE_DESCRIPTION',
    `Discover community-listed places and local services wherever you are, with sources and last-checked dates shown for every entry.`
  ),
  locale: defaults.site.locale,
  themeColor: defaults.site.themeColor,
  themeColorDark: defaults.site.themeColorDark,
  contactEmail: setting('VITE_CONTACT_EMAIL', defaults.site.contactEmail),
  githubUrl: defaults.site.githubUrl,
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

export const emergencyContacts: EmergencyContact[] = defaults.emergencyContacts;

/** Canonical routes that must exist, be linked in the footer, and enter the sitemap. */
export const routes: Record<string, string> = defaults.routes;

export const isProduction = env.PROD === true;

/**
 * Flagged by `src/lib/validate-config.ts` at build time in production. It is
 * not fatal — the site still works on a placeholder domain — but the build log
 * shouts about it and the README explains the one-line fix.
 */
export const configWarnings: string[] = [];

if (site.url === 'https://townpulse.app') {
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