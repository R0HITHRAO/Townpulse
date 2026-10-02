/**
 * Supported languages
 * ===================
 *
 * Kept in its own module, with no side effects, because it is needed by code
 * that must not boot i18next:
 *
 *   - `hooks/useSeo.ts` reads it to emit `hreflang` alternates. Importing
 *     `i18n/index.ts` there would call `i18n.use(initReactI18next).init(...)`
 *     at module load, which breaks any test that mocks `react-i18next`
 *     partially (it only needs `useTranslation`).
 *   - `scripts/generate-sitemap.mjs` cannot import TypeScript at all.
 *
 * Adding a language therefore means editing this file and `en.json`/`hi.json`;
 * `kn` is registered but intentionally inherits English key-by-key.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const STORAGE_KEY = 'townpulse_lang';

export const FALLBACK: LanguageCode = 'en';