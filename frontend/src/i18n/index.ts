/**
 * TownPulse i18n setup
 * ====================
 *
 * Fixes a serious defect in the previous setup: `hi.json` was fully translated
 * but never registered, and `lng` was hardcoded to `'en'` — so the Hindi
 * translation was dead code and the site was English-only.
 *
 * `en` is the complete catalogue. `hi` is registered as a real translation, and
 * `kn` inherits key-by-key from English via i18next's `fallbackLng`, so a
 * missing key degrades to readable English rather than showing a raw key path.
 *
 * Detection order: explicit choice -> stored preference -> browser languages
 * -> English.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import hi from './hi.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const STORAGE_KEY = 'townpulse_lang';

const FALLBACK: LanguageCode = 'en';

/** True when a code (or locale like `hi-IN`) is one we support. */
function resolveLanguage(raw?: string | null): LanguageCode | null {
  if (!raw) return null;
  const base = raw.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.some((l) => l.code === base)
    ? (base as LanguageCode)
    : null;
}

/** The stored or browser-detected language, without side effects. */
export function detectLanguage(): LanguageCode {
  if (typeof window === 'undefined') return FALLBACK;
  try {
    const stored = resolveLanguage(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // localStorage can throw in private mode; fall through to navigator.
  }
  for (const candidate of window.navigator.languages ?? []) {
    const match = resolveLanguage(candidate);
    if (match) return match;
  }
  return FALLBACK;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    // Kannada falls back key-by-key to the complete English catalogue.
    kn: { translation: {} },
  },
  lng: detectLanguage(),
  fallbackLng: FALLBACK,
  supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

/**
 * Persist a language choice and sync `<html lang>`.
 *
 * The `lang` attribute matters: without it a screen reader pronounces Kannada
 * text with English phonetics, which makes the page unusable.
 */
export function setLanguage(code: LanguageCode): void {
  void i18n.changeLanguage(code);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage unavailable — the choice still applies for this session.
  }
}

export default i18n;