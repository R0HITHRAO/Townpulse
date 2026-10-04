/**
 * i18n key guard
 * ==============
 *
 *   npm run check:i18n
 *
 * Two silent defects motivate this:
 *
 *  1. A key that exists in code but not in `en.json` renders its raw path
 *     ("listing.open") straight to the user. Nothing type-checks that.
 *  2. `en.json` grew section by section during the rebuild while `hi.json`
 *     (the registered Hindi translation) did not keep pace. i18next falls back
 *     per key to English, which is correct behaviour — but the gap itself was
 *     invisible. This prints it, so it can never quietly become permanent.
 *
 * Static `t('literal')` calls only. Template keys (`t(`about.${key}`)`) and
 * keys passed through variables cannot be extracted statically and are
 * deliberately skipped, not guessed at.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../src');

const en = JSON.parse(readFileSync(join(src, 'i18n/en.json'), 'utf8'));
const hiPath = join(src, 'i18n/hi.json');
const hi = JSON.parse(readFileSync(hiPath, 'utf8'));

/** "a.b.c" for every leaf value in a nested catalogue. */
function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const enKeys = new Set(flatten(en));
const hiKeys = new Set(flatten(hi));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const STATIC_KEY_RE = /\bt\(\s*'([a-zA-Z0-9_.]+)'|\bt\(\s*"([a-zA-Z0-9_.]+)"/g;

/**
 * i18next stores plural forms as sibling keys, not children:
 *   t('categories.listingCount', { count: 3 })
 *     -> resolves "categories.listingCount_other" at runtime.
 * Flattening produces `...listingCount_one` / `...listingCount_other`, so the
 * literal base key is legitimately absent from `en.json`. Treating that as a
 * violation would flag correct code and teach devs to distrust the guard.
 */
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];

/** True if `key` is a leaf, or a plural base with at least one CLDR form. */
function isResolvable(key) {
  if (enKeys.has(key)) return true;
  return PLURAL_SUFFIXES.some((suffix) => enKeys.has(`${key}_${suffix}`));
}

/**
 * A key that resolves to an object renders as "[object Object]" / the raw key
 * — `t('about')` where `about` is a section of the catalogue, not a string.
 * Caught separately because the flattened leaf set cannot express it.
 */
function isBranchNotString(key) {
  const parts = key.split('.');
  let node = en;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!node || typeof node !== 'object') return false;
    node = node[parts[i]];
  }
  return Boolean(node) && typeof node === 'object';
}

const missing = [];
const branchKeys = [];
let checked = 0;
for (const file of walk(src)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(STATIC_KEY_RE)) {
    const key = match[1] ?? match[2];
    if (!key) continue;
    checked += 1;
    if (isResolvable(key)) continue;
    const site = `${file.slice(src.length + 1)}: t('${key}')`;
    (isBranchNotString(key) ? branchKeys : missing).push(site);
  }
}

if (missing.length > 0 || branchKeys.length > 0) {
  if (missing.length > 0) {
    console.error('\ni18n: keys used in code but missing from src/i18n/en.json:\n');
    for (const line of missing) console.error(`  - ${line}`);
    console.error('\nA missing key renders its raw path to the user. Add it to en.json.\n');
  }
  if (branchKeys.length > 0) {
    console.error('\ni18n: keys that point at a section object, not a string:\n');
    for (const line of branchKeys) {
      console.error(`  - ${line}`);
    }
    console.error(
      '\nThese cannot render. Use a leaf inside the section ' +
        "(e.g. t('about.howWeVerifyHeading')), not the section name.\n"
    );
  }
  process.exit(1);
}

const missingInHi = [...enKeys].filter((key) => !hiKeys.has(key));
console.log(`  i18n OK: ${checked} static key usages checked against ${enKeys.size} English keys.`);
console.log(
  `  Hindi coverage: ${enKeys.size - missingInHi.length}/${enKeys.size} keys ` +
    `(the rest fall back to English by design — see src/i18n/index.ts).`
);
