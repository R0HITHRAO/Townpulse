/**
 * Category slug → i18n key
 * =========================
 * `categories.*` in the catalogues is keyed by the stable slug
 * (`backend/scripts/build_seed_from_osm.py` defines the eight), except for
 * "home-services", which cannot be a key segment as written and appears as
 * `homeServices`.
 *
 * Both the /categories index and the /c/<slug> page route through these
 * helpers, so a category reads the same name everywhere it appears.
 */

const SLUG_TO_KEY: Record<string, string> = {
  healthcare: 'healthcare',
  food: 'food',
  shelter: 'shelter',
  auto: 'auto',
  civic: 'civic',
  community: 'community',
  education: 'education',
  'home-services': 'homeServices',
};

/** i18n key for a category name, or null when the slug is not one of the eight. */
export function categoryNameKey(slug?: string | null): string | null {
  if (!slug) return null;
  const key = SLUG_TO_KEY[slug];
  return key ? `categories.${key}` : null;
}

/** i18n key for a category description, or null. */
export function categoryDescriptionKey(slug?: string | null): string | null {
  const nameKey = categoryNameKey(slug);
  return nameKey ? `${nameKey}Desc` : null;
}
