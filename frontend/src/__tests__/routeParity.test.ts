import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { routes } from '../config/site';

/**
 * Route parity guard.
 *
 * AUDIT.md's addendum: `prerender.mjs` emitted /emergency, /categories and
 * /c/<slug>, and the sitemap listed them, while App.tsx had no matching
 * <Route> — so the same URL showed real content to a crawler and the 404 page
 * to anyone who navigated client-side. This test fails if a canonical route
 * ever loses its React counterpart again.
 *
 * Resolved from `process.cwd()` (the vitest root), not `import.meta.url`:
 * vitest transforms this file to CJS, where `import.meta.url` is not a file
 * URL and `new URL('../App.tsx', ...)` collapses to a bogus root-level path.
 */
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

describe('route parity with the site config', () => {
  it('implements every canonical route in App.tsx', () => {
    const missing = Object.values(routes).filter((path) => !appSource.includes(`path="${path}"`));
    expect(missing).toEqual([]);
  });

  it('routes the shareable category URLs the sitemap advertises', () => {
    expect(appSource).toContain('path="/c/:slug"');
  });
});
