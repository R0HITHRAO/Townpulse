/**
 * Preview smoke test: serves dist/ locally (mirroring the Vercel rewrite rule),
 * then checks both the served HTML and the rendered application.
 *
 * Why a browser is involved
 * -------------------------
 * The HTTP checks below catch a missing file or a broken SPA fallback, but every
 * path returns the same 200 `index.html`, so they cannot see a route that loads
 * and *then* navigates somewhere else. A deep link is exactly that failure mode:
 * `/listings/<id>` or `/c/<slug>` can serve 200, boot the app, and land on `/`
 * (a stray redirect, a route guard, or a catch-all route winning) while the
 * response looks perfect. That is why the deep links are loaded in a real
 * browser and both the URL and the rendered page are asserted.
 *
 * What the browser pass covers
 * ----------------------------
 * - public deep links: a listing, a category, and the two not-found screens an
 *   unknown listing/category must show at the URL the visitor used;
 * - `/dashboard`: signed out → `/login`, business owner → stays, so the guard
 *   neither under- nor over-blocks;
 * - `/admin`: signed out → `/login`, non-admin → `/`, admin → stays.
 *
 * The browser is the locally installed Chrome or Edge — `playwright-core`
 * ships no browser download. Set `SMOKE_BROWSER_CHANNEL=msedge` (or `chrome`) to
 * choose one; set `SMOKE_SKIP_BROWSER=1` to run the HTTP checks alone on a
 * machine with no browser.
 *
 * Usage: npm run build && node scripts/smoke-preview.mjs
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing — run `npm run build` first.');
  process.exit(1);
}

const PORT = Number(process.env.SMOKE_PORT || 4173);
const BASE = `http://localhost:${PORT}`;

// ── Fixtures ────────────────────────────────────────────────────────────────
// The repository snapshot ships no listings, so the listing and category deep
// links are checked against records supplied at request time instead of on disk.
const LISTING = {
  id: 'osm-smoke-1',
  name: 'Smoke Test Pharmacy',
  address: '1 Test Road, Bhavani',
  verified: true,
  status: 'active',
  description: 'Fixture used by the preview smoke test.',
  category: { id: 2, name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
  lat: 11.4455,
  lng: 77.6819,
  phone: '+91 90000 00000',
  hours: { all_days: '9:00 AM - 9:00 PM' },
};
// The API's category payload has no slug column, so CategoryPage resolves the
// slug from this snapshot; the heading itself comes from the catalogue.
const CATEGORY = {
  id: 2,
  name: 'Healthcare',
  slug: 'healthcare',
  icon: '🏥',
  description: 'Clinics, pharmacies and doctors.',
};
const SNAPSHOT = {
  generated_from: null,
  attribution: 'smoke test fixture',
  town: null,
  categories: [CATEGORY],
  listings: [LISTING],
};

/** A user the guard can evaluate; only role and identity differ per case. */
const makeUser = ({ id, name, email, role }) => ({
  id,
  name,
  email,
  role,
  phone_verified: true,
  email_verified: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
});
// A signed-in account with no moderation rights: the /admin guard must turn it
// away, not merely stop anonymous visitors.
const REGULAR_USER = makeUser({
  id: 'u-smoke-visitor',
  name: 'Smoke Visitor',
  email: 'visitor@townpulse.test',
  role: 'user',
});
// The account /dashboard exists for: accepting admins there too would not prove
// the page is reachable by its actual audience.
const BUSINESS_USER = makeUser({
  id: 'u-smoke-owner',
  name: 'Smoke Owner',
  email: 'owner@townpulse.test',
  role: 'business_owner',
});
const ADMIN_USER = makeUser({
  id: 'u-smoke-admin',
  name: 'Smoke Admin',
  email: 'smoke@townpulse.test',
  role: 'admin',
});

// ── Expectations ────────────────────────────────────────────────────────────
// Text unique to the homepage hero: also the heading a non-admin is redirected
// to, so it identifies both "the guard sent the visitor home" and "home rendered".
const HOME_HERO = 'Find what you need right around you.';
const HEADINGS = {
  login: 'Sign in to TownPulse',
  notFound: 'Page not found',
  dashboard: 'Business Owner Dashboard',
  admin: 'Town Administrator Console',
};
// The two not-found screens share a heading, so each also asserts a link only
// its own page offers.
const NOT_FOUND_CASES = [
  // ListingDetail renders its empty state as an h2, not an h1.
  { path: '/listings/does-not-exist', headingTag: 'h2', expectedText: 'Back to home' },
  { path: '/c/not-a-category', expectedText: 'Browse categories' },
];
/** URLs every deep link serves, even when no file exists for them. */
const HTTP_ROUTES = [
  '/',
  '/about',
  '/map',
  '/categories',
  '/emergency',
  `/listings/${LISTING.id}`,
  `/c/${CATEGORY.slug}`,
  '/listings/does-not-exist',
  '/c/not-a-category',
  '/admin',
  '/dashboard',
];

// ── Harness ─────────────────────────────────────────────────────────────────
const failures = [];
const pass = (label) => console.log(`PASS ${label}`);
const fail = (label, detail) => {
  failures.push(detail ? `${label}: ${detail}` : label);
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
};

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const requestPath = req.url.split('?')[0];
  let file = join(dist, requestPath);
  // Prerendered routes are written as `<route>/index.html` directories.
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (requestPath === '/' || !existsSync(file)) {
    // SPA fallback, mirroring the vercel.json rewrite.
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(join(dist, 'index.html')));
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

async function checkHttp(route) {
  const response = await fetch(`${BASE}${route}`);
  const body = await response.text();
  const ok = response.status === 200 && body.includes('id="root"');
  if (ok) pass(`http ${route} status=${response.status} bytes=${body.length}`);
  else fail(`http ${route}`, `status=${response.status} bytes=${body.length}`);
}

async function launchBrowser() {
  const channels = [process.env.SMOKE_BROWSER_CHANNEL, 'chrome', 'msedge'].filter(Boolean);
  let lastError;
  for (const channel of channels) {
    try {
      const browser = await chromium.launch({ channel });
      console.log(`browser: ${channel} ${browser.version()}`);
      return browser;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `no Chrome or Edge could be launched${lastError ? ` (${lastError.message.split('\n')[0]})` : ''}`
  );
}

/**
 * A fresh browser context with the fixtures every check needs. `user` seeds a
 * session before any app script runs; omit it for the signed-out checks, which
 * must start with no session or the guards would have nothing to reject.
 */
async function createContext(browser, user = null) {
  const context = await browser.newContext({ serviceWorkers: 'block' });

  if (user) {
    await context.addInitScript((session) => {
      try {
        localStorage.setItem('townpulse_access_token', 'smoke-token');
        localStorage.setItem('townpulse_user', JSON.stringify(session));
      } catch {
        /* storage unavailable — the guard will redirect and the check will say so */
      }
    }, user);
  }

  // There is no backend behind the static preview: answer API calls explicitly
  // so the pages take their offline paths instead of parsing the HTML fallback.
  await context.route('**/api/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'smoke test: no backend' }),
    })
  );
  await context.route('**/data/listings.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SNAPSHOT),
    })
  );
  // Keep the run deterministic and offline: no map tiles, fonts or analytics.
  await context.route('https://**', (route) => route.abort());

  return context;
}

/** Runs `checks` in a context for `user` (null = signed out), then closes it. */
async function withSession(browser, user, checks) {
  const context = await createContext(browser, user);
  try {
    await checks(context);
  } finally {
    await context.close();
  }
}

/**
 * Loads `path` as a fresh document — the deep-link case a crawler or a pasted
 * link produces — and fails if the app ends somewhere other than `expectedPath`
 * or renders the wrong page. `expectedPath` defaults to `path`; a route guard
 * test passes the URL the guard should redirect to instead.
 */
async function checkDeepLink(
  context,
  { path, expectedPath = path, heading, headingTag = 'h1', expectedText }
) {
  const page = await context.newPage();
  try {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() !== 200) {
      fail(`deep link ${path}`, `document status=${response ? response.status() : 'none'}`);
      return;
    }

    // Wait for the lazy route (and any guard redirect) to settle on its heading.
    await page
      .waitForFunction(
        ([tag, expected]) => {
          const el = document.querySelector(tag);
          return !!el && el.textContent.trim() === expected;
        },
        [headingTag, heading],
        { timeout: 10_000 }
      )
      .catch(() => {});

    const finalPath = new URL(page.url()).pathname;
    const renderedHeading = (
      await page.locator(headingTag).first().textContent().catch(() => null)
    )?.trim();
    // Collapse whitespace: the hero heading is split across inline elements, so
    // `innerText` contains newlines where the source has spaces.
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const landedOnHome = body.includes(HOME_HERO);
    const isRedirectCheck = expectedPath !== path;

    if (finalPath === expectedPath) {
      pass(
        isRedirectCheck
          ? `deep link ${path} redirected to ${expectedPath}`
          : `deep link ${path} kept its URL`
      );
    } else {
      fail(
        `deep link ${path}`,
        `expected ${expectedPath}, URL is ${finalPath}${isRedirectCheck ? ' (guard let it through?)' : ''}`
      );
    }

    if (renderedHeading === heading) pass(`deep link ${path} rendered "${heading}"`);
    else fail(`deep link ${path}`, `rendered "${renderedHeading ?? 'no heading'}"`);

    // `expectedText` distinguishes screens that share a heading (the two
    // not-found pages) by a line only the expected one renders.
    if (expectedText) {
      if (body.includes(expectedText)) pass(`deep link ${path} showed "${expectedText}"`);
      else fail(`deep link ${path}`, `missing "${expectedText}"`);
    }

    // The homepage is the expected destination of one guard check (/admin for a
    // signed-in non-admin), so its hero is only a failure when it was not asked
    // for. `expectedPath === '/'` inverts the assertion instead of skipping it.
    if (expectedPath === '/') {
      if (landedOnHome) pass(`deep link ${path} landed on the homepage`);
      else fail(`deep link ${path}`, 'expected the homepage but its hero is missing');
    } else if (landedOnHome) {
      fail(`deep link ${path}`, 'homepage hero is on screen');
    } else {
      pass(`deep link ${path} did not fall back to the homepage`);
    }
  } finally {
    await page.close();
  }
}

async function checkBrowser() {
  if (process.env.SMOKE_SKIP_BROWSER === '1') {
    console.log('SKIP browser checks (SMOKE_SKIP_BROWSER=1)');
    return;
  }

  let browser;
  try {
    browser = await launchBrowser();
  } catch (error) {
    fail('browser checks', `${error.message} — install Chrome/Edge or set SMOKE_SKIP_BROWSER=1`);
    return;
  }

  try {
    // Signed out: the public deep links, both guards, and the not-found screens.
    await withSession(browser, null, async (context) => {
      await checkDeepLink(context, { path: `/listings/${LISTING.id}`, heading: LISTING.name });
      await checkDeepLink(context, { path: `/c/${CATEGORY.slug}`, heading: 'Health & clinics' });
      for (const path of ['/dashboard', '/admin']) {
        await checkDeepLink(context, {
          path,
          expectedPath: '/login',
          heading: HEADINGS.login,
        });
      }
      for (const notFound of NOT_FOUND_CASES) {
        await checkDeepLink(context, {
          heading: HEADINGS.notFound,
          ...notFound,
        });
      }
    });

    // Signed in: each role is only checked on the URL it is allowed to reach, so
    // neither under-blocking (a non-admin seeing /admin) nor over-blocking (an
    // owner bounced off their own dashboard) can pass.
    await withSession(browser, ADMIN_USER, (context) =>
      checkDeepLink(context, { path: '/admin', heading: HEADINGS.admin })
    );
    await withSession(browser, BUSINESS_USER, (context) =>
      checkDeepLink(context, { path: '/dashboard', heading: HEADINGS.dashboard })
    );
    await withSession(browser, REGULAR_USER, (context) =>
      checkDeepLink(context, { path: '/admin', expectedPath: '/', heading: HOME_HERO })
    );
  } finally {
    await browser.close();
  }
}

// 120s: a heading that never appears costs 10s per check before it is reported.
const watchdog = setTimeout(() => {
  console.error('FAIL: smoke test timed out');
  process.exit(1);
}, 120_000);

server.on('error', (error) => {
  console.error(`FAIL: could not serve dist on ${PORT} — ${error.message}`);
  process.exit(1);
});

server.listen(PORT, async () => {
  try {
    for (const route of HTTP_ROUTES) await checkHttp(route);
    await checkBrowser();
  } catch (error) {
    fail('smoke test', error.stack || error.message);
  } finally {
    clearTimeout(watchdog);
    server.close();
    if (failures.length > 0) {
      console.error(`\n${failures.length} check(s) failed.`);
      process.exit(1);
    }
    console.log('\nAll preview smoke checks passed.');
    process.exit(0);
  }
});
