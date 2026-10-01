/**
 * Merge the i18n catalogue parts into one en.json.
 * Run once: `node scripts/merge-catalogue.mjs` (not part of the build).
 */
import fs from 'node:fs';

const dir = new URL('../src/i18n/', import.meta.url);
const file = new URL('en.json', dir);

/**
 * Legacy flat keys.
 *
 * The rebuild introduced namespaced sections (nav.*, home.*, listing.*) but a
 * number of pre-existing components still call t('app_name') etc. Rather than
 * show a raw key string to users mid-migration, these keys are kept as a
 * compatibility layer. Delete each block as its component is migrated.
 */
const LEGACY = {
  app_name: 'TownPulse',
  tagline: 'Find what you need, in your town — verified local services',
  search_placeholder: 'Search clinics, mechanics, food, shelters, plumbers...',
  categories: 'Categories',
  all_categories: 'All categories',
  verified_only: 'Verified only',
  radius: 'Search radius',
  distance: 'Distance',
  view_map: 'Map view',
  view_list: 'List view',
  submit_listing: 'Suggest a listing',
  claim_listing: 'Claim this listing',
  verified: 'Verified',
  unverified: 'Not yet verified',
  call: 'Call',
  email: 'Email',
  website: 'Website',
  directions: 'Directions',
  hours: 'Opening hours',
  address: 'Address',
  login: 'Log in',
  register: 'Register',
  logout: 'Log out',
  admin_dashboard: 'Admin dashboard',
  business_dashboard: 'Business dashboard',
  about: 'About',
  accessibility: 'Accessibility',
  footer_text: 'TownPulse — open-source local community infrastructure.',
  print_guide: 'Print guide',
  print_directory: 'Print pocket directory',
  interactive_route: 'Directions',
  community_qa: 'Community Q&A',
  fastest_route: 'Fastest local route',
  drive: 'Drive',
  walk: 'Walk',
  cycle: 'Cycle',
  not_found_title: 'Page not found',
  not_found_desc: "The page you're looking for doesn't exist or has been moved.",
  back_home: 'Back to home',
  privacy: 'Privacy',
  contact: 'Contact',
  seo_home_title: 'Local services for your town | TownPulse',
  seo_home_desc:
    'Discover local clinics, mechanics, shops, shelters and community services near you.',
};

const en = JSON.parse(fs.readFileSync(file, 'utf8'));
const merged = { ...LEGACY, ...en };
fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');

console.log('sections:', Object.keys(merged).length);
console.log(
  'namespaced:',
  Object.keys(en).filter((k) => typeof merged[k] === 'object').join(', ')
);
console.log('legacy flat keys:', Object.keys(LEGACY).length);
console.log(
  'total strings:',
  Object.values(merged).reduce((n, v) => n + Object.keys(v).length, 0)
);