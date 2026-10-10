/**
 * TownPulse site configuration
 * ============================
 *
 * The single source of truth for everything the site exposes about itself that
 * is not the user's location: canonical origin, wordmark, theme, emergency
 * contacts and the route table. It deliberately does NOT contain a town: the
 * app is now location-first and resolves where the user is at runtime
 * (see LocationContext and useCurrentLocation).
 *
 * Retargeting the site (different domain, wordmark, theme, contacts) is still
 * done through env vars and site.defaults.json below.
 */

import defaults from './site.defaults.json';

const env = import.meta.env;

/** Read a build-time env override, falling back to the value below. */
function setting(key: string, fallback: string): string {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export const site = {
  /** Canonical origin. Must be set to the real domain in production. */
  url: setting('VITE_SITE_URL', defaults.site.url).replace(/\/$/, ''),
  name: 'TownPulse',
  /** Wordmark suffix shown beside the name. */
  tagline: setting('VITE_SITE_TAGLINE', defaults.site.tagline),
  description: setting(
    'VITE_SITE_DESCRIPTION',
    'A community directory of local services - clinics, mechanics, shops, civic offices and emergency numbers, with the source and date shown for every entry.'
  ),
  locale: defaults.site.locale,
  themeColor: defaults.site.themeColor,
  themeColorDark: defaults.site.themeColorDark,
  contactEmail: setting('VITE_CONTACT_EMAIL', defaults.site.contactEmail),
  githubUrl: defaults.site.githubUrl,
} as const;

/** Canonical routes that must exist, be linked in the footer, and enter the sitemap. */
export const routes = defaults.routes;

/** One emergency contact as declared in site.defaults.json. */
export interface EmergencyContact {
  id: string;
  /** i18n key for the contact's label (e.g. "emergency.police"). */
  labelKey: string;
  /** Dialable number; empty means "not yet collected". */
  phone: string;
  /** Optional i18n key for a short note shown under the label. */
  noteKey?: string;
}

/** Emergency services as disclosed in the footer and Emergency page. */
export const emergencyContacts = defaults.emergencyContacts as EmergencyContact[];

export const isProduction = env.PROD === true;

/**
 * Build-time warnings for settings the operator left at their shipped defaults.
 * These are hints, not errors: the site still works, but a placeholder domain or
 * missing emergency numbers mean SEO, share previews and safety pages are wrong.
 */
export const configWarnings: string[] = [];

if (site.url.includes('townpulse.app')) {
  configWarnings.push(
    'VITE_SITE_URL is still the placeholder (' + site.url + '). ' +
      'Canonical URLs, sitemap and OG images will point at the wrong origin.'
  );
}

if (!emergencyContacts.some((c) => c.phone)) {
  configWarnings.push(
    'Most emergency numbers are empty. The Emergency page will show ' +
      '"number not yet collected" - see DATA_NEEDED.md.'
  );
}
