/**
 * Assert the generated service worker can no longer pin an old build.
 *
 *   npm run check:sw          (run after `npm run build`)
 *
 * Why this exists
 * ---------------
 * Service workers are the one part of this app that outlive a deployment. The
 * worker generated for the site used to be built with two settings that,
 * together, froze production on an old commit for two days:
 *
 *  1. `globPatterns` included `html`, so `index.html` went into the precache.
 *     `precacheAndRoute()` matches a navigation to `/` via its `directoryIndex`
 *     rewrite, so the *previous* deployment's shell — naming the previous
 *     deployment's content-hashed asset files — kept answering every reload.
 *  2. `navigateFallback` defaulted to `index.html`, which emits a
 *     `NavigationRoute(createHandlerBoundToURL('index.html'))` registered
 *     *before* every runtime route. That made any NetworkFirst navigation rule
 *     dead code: navigations never reached the network at all.
 *
 * Net effect: the code fix landed, the deploy went green, and the site still
 * served the broken bundle. No unit test and no type check can see this — only
 * the emitted worker can. This script reads `dist/sw.js` and fails the build
 * when either of those two settings comes back.
 *
 * What it asserts
 * ---------------
 *  - no `createHandlerBoundToURL` / `NavigationRoute` (navigateFallback off)
 *  - no `.html` entry in the precache manifest (the shell is not precached)
 *  - a runtime `registerRoute` still exists, including a `navigate` route backed
 *    by `NetworkFirst`, so removing the shell fallback does not also remove
 *    offline support for navigations
 *  - `dist/index.html` does not reference `registerSW.js`, i.e.
 *    `injectRegister: null` still holds and `/sw.js` is registered exactly once
 *    (by `src/sw.ts`), because two registrations race over the same worker.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '../dist');
const swPath = resolve(distDir, 'sw.js');
const htmlPath = resolve(distDir, 'index.html');

const problems = [];

if (!existsSync(swPath)) {
  console.error(`\n  ${swPath} does not exist — run \`npm run build\` first.\n`);
  process.exit(1);
}

const sw = readFileSync(swPath, 'utf8');

// ── 1. The navigation fallback must stay disabled ────────────────────────────
if (sw.includes('createHandlerBoundToURL')) {
  problems.push(
    'dist/sw.js contains `createHandlerBoundToURL`. `workbox.navigateFallback` ' +
      'has come back on, so a NavigationRoute will answer every navigation ' +
      'from the precached index.html and re-pin the previous deployment.'
  );
}
if (sw.includes('NavigationRoute')) {
  problems.push(
    'dist/sw.js contains `NavigationRoute`. That route is registered ahead of ' +
      'the runtime routes, so the NetworkFirst navigation rule below it is ' +
      'dead code and navigations never reach the network.'
  );
}

// ── 2. The app shell must not be precached ───────────────────────────────────
// `precacheAndRoute([{url:"…",revision:"…"}, …], …)` — a `.html` entry here is
// always the shell, because precaching the shell is what froze production.
const precacheEntry = /(?:url\s*:\s*|"url"\s*:\s*)"[^"]*\.html?"/;
if (precacheEntry.test(sw)) {
  const found = sw.match(precacheEntry)[0];
  problems.push(
    `dist/sw.js precaches an HTML document (${found}). index.html names one ` +
      'specific build\'s content-hashed assets, so precaching it lets an old ' +
      'shell keep answering navigations after a deploy. Remove `html` from ' +
      '`workbox.globPatterns`.'
  );
}

// ── 3. Navigation caching must still exist ───────────────────────────────────
if (!sw.includes('registerRoute')) {
  problems.push(
    'dist/sw.js registers no runtime routes at all. Navigations would have no ' +
      'offline behaviour.'
  );
} else if (!/"navigate"|'navigate'/.test(sw) || !sw.includes('NetworkFirst')) {
  problems.push(
    'dist/sw.js has no NetworkFirst navigation route. With the app-shell ' +
      'fallback removed, that route is what still serves the shell offline — ' +
      'see `workbox.runtimeCaching[0]` in vite.config.ts.'
  );
}

// ── 4. Exactly one registration path ─────────────────────────────────────────
if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf8');
  if (html.includes('registerSW.js')) {
    problems.push(
      'dist/index.html references registerSW.js, so `injectRegister` is no ' +
        'longer `null`. The built page would register /sw.js twice (once from ' +
        'the injected snippet, once from src/sw.ts) and the two registrations ' +
        'race over the same worker.'
    );
  }
}

if (problems.length > 0) {
  console.error('\n  dist/sw.js would pin a stale build in production:\n');
  for (const p of problems) console.error(`    - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  '\n  dist/sw.js is update-safe: no navigateFallback, no precached shell, ' +
    'NetworkFirst navigation route present, /sw.js registered once.\n'
);
