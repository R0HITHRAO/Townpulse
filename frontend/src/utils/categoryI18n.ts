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

/**
 * Whether `slug` is one of the eight categories the app ships with.
 *
 * The API's category rows have no slug column and the bundled snapshot is
 * optional (it is empty by default), so a canonical slug has to resolve even
 * when neither source can supply the mapping.
 */
export function isKnownCategorySlug(slug?: string | null): boolean {
  return !!slug && Object.prototype.hasOwnProperty.call(SLUG_TO_KEY, slug);
}

/** A built-in category: enough to render the directory with no data at all. */
export interface BuiltInCategory {
  slug: string;
  name: string;
  icon: string;
}

/**
 * The eight categories the app ships with, in the order the directory shows
 * them.
 *
 * The API's rows come from the database and the bundled snapshot ships
 * `categories: []`, so both can be empty. The /c/<slug> pages still exist for
 * these eight, which means /categories must list them rather than showing an
 * empty directory.
 */
export const BUILT_IN_CATEGORIES: readonly BuiltInCategory[] = [
  { slug: 'healthcare', name: 'Health & clinics', icon: '🏥' },
  { slug: 'food', name: 'Food & groceries', icon: '🛒' },
  { slug: 'shelter', name: 'Shelter & emergency', icon: '🚨' },
  { slug: 'auto', name: 'Mechanics & transport', icon: '🔧' },
  { slug: 'civic', name: 'Civic & government', icon: '🏛' },
  { slug: 'community', name: 'Community & volunteers', icon: '🤝' },
  { slug: 'education', name: 'Education & library', icon: '📚' },
  { slug: 'home-services', name: 'Home & repair', icon: '🧰' },
];

/** i18n key for a category description, or null. */
export function categoryDescriptionKey(slug?: string | null): string | null {
  const nameKey = categoryNameKey(slug);
  return nameKey ? `${nameKey}Desc` : null;
}
