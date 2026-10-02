/**
 * Assert that no pre-rendered page advertises an og:image that does not exist.
 *
 *   node scripts/verify-og-images.mjs
 *
 * Why this exists
 * ---------------
 * `generate:og` skips rendering when the native `sharp` module cannot load, so a
 * build on such a host produces only the committed `home.png`. A previous
 * version still wrote the full manifest in that situation, so all 181
 * pre-rendered pages claimed a per-listing card — 178 of which were never
 * written. Every WhatsApp share of a listing then rendered a broken image.
 *
 * Nothing else in the toolchain catches this: the build exits 0, and the unit
 * tests do not read `dist/`. This walks the real output instead of trusting the
 * manifest.
 *
 * Exits non-zero if any page references a missing file, so CI fails on it.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

/** Every `index.html` under dist/, including the nested route directories. */
function collect(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (entry === 'index.html') acc.push(full);
  }
  return acc;
}

const pages = collect(dist);
const missing = new Map();
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  // Match any absolute og:image, then resolve its path back inside dist/.
  for (const m of html.matchAll(/property="og:image"\s+content="([^"]+)"/g)) {
    checked += 1;
    const url = m[1];
    let pathname;
    try {
      pathname = new URL(url).pathname;
    } catch {
      // Relative URL (dev / unknown origin) — resolve it as-is.
      pathname = url;
    }
    const target = join(dist, decodeURIComponent(pathname));
    if (!existsSync(target)) {
      missing.set(pathname, (missing.get(pathname) ?? 0) + 1);
    }
  }
}

if (missing.size > 0) {
  console.error(`\n  ${missing.size} distinct og:image target(s) do not exist:\n`);
  for (const [pathname, count] of [...missing.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`    - ${pathname}  (referenced by ${count} page${count === 1 ? '' : 's'})`);
  }
  console.error(`\n  ${checked - [...missing.values()].reduce((a, b) => a + b, 0)}/${checked} references resolved.\n`);
  process.exit(1);
}

console.log(`\n  ${checked}/${checked} og:image references resolve across ${pages.length} pages.\n`);