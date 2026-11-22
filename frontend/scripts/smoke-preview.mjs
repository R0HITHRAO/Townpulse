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
 * browser and both the URL and the rendered heading are asserted.
 *
 * `/dashboard` is tested from both sides. Signed out it must land on `/login`,
 * so that check expects the URL to change and fails if the guard stops
 * protecting a business page; signed in as a business owner the same URL must
 * stay put, so the guard cannot over-block the account the page exists for.
 * Unknown listing and category URLs must also stay put and render their own
 * not-found screen, rather than quietly redirecting a mistyped link home.
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

// Fixtures. The repository snapshot ships no listings, so the listing deep link
// is checked against a record supplied at request time instead of on disk.
const LISTING_ID = 'osm-smoke-1';
const LISTING_NAME = 'Smoke Test Pharmacy';
// Slug → category mapping lives in the bundled snapshot, and the heading comes
// from the catalogue, so /c/healthcare must read "Health & clinics".
const CATEGORY_SLUG = 'healthcare';
const CATEGORY_HEADING = 'Health & clinics';
const LOGIN_HEADING = 'Sign in to TownPulse';
const NOT_FOUND_HEADING = 'Page not found';
// The two not-found screens share a heading, so each is also identified by the
// link only its own page offers.
const LISTING_NOT_FOUND_LINK = 'Back to home';
const CATEGORY_NOT_FOUND_LINK = 'Browse categories';
const SNAPSHOT = {
  generated_from: null,
  attribution: 'smoke test fixture',
  town: null,
  categories: [
    {
      id: 2,
      name: 'Healthcare',
      slug: 'healthcare',
      icon: '🏥',
      description: 'Clinics, pharmacies and doctors.',
    },
  ],
  listings: [
    {
      id: LISTING_ID,
      name: LISTING_NAME,
      address: '1 Test Road, Bhavani',
      verified: true,
      status: 'active',
      description: 'Fixture used by the preview smoke test.',
      category: { id: 2, name: 'Healthcare', icon: '🏥', slug: 'healthcare' },
      lat: 11.4455,
      lng: 77.6819,
      phone: '+91 90000 00000',
      hours: { all_days: '9:00 AM - 9:00 PM' },
    },
  ],
};
// A business owner, not an admin: the /dashboard guard accepts either, but the
// page exists for owners, so this is the account it must not over-block.
const BUSINESS_USER = {
  id: 'u-smoke-owner',
  name: 'Smoke Owner',
  email: 'owner@townpulse.test',
  role: 'business_owner',
  phone_verified: true,
  email_verified: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};
const DASHBOARD_HEADING = 'Business Owner Dashboard';
const ADMIN_USER = {
  id: 'u-smoke-admin',
  name: 'Smoke Admin',
  email: 'smoke@townpulse.test',
  role: 'admin',
  phone_verified: true,
  email_verified: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};
// Text unique to the homepage hero: if it is on screen, the deep link bounced.
const HOME_HERO = 'Find what you need right around you.';

const failures = [];
const pass = (label) => console.log(`PASS ${label}`);
const fail = (label, detail) => {
  failures.push(detail ? `${label}: ${detail}` : label);
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
};

const types = {
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
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

/** Deep links must serve the shell too, even though no file exists for them. */
const routes = [
  '/',
  '/about',
  '/map',
  '/categories',
  '/emergency',
  `/listings/${LISTING_ID}`,
  `/c/${CATEGORY_SLUG}`,
  '/listings/does-not-exist',
  '/c/not-a-category',
  '/admin',
  '/dashboard',
];

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

    // Wait for the lazy route to mount and settle on its heading.
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

    const finalUrl = page.url();
    const finalPath = new URL(finalUrl).pathname;
    const renderedHeading = (
      await page.locator(headingTag).first().textContent().catch(() => null)
    )?.trim();
    // Collapse whitespace: the hero heading is split across inline elements, so
    // `innerText` contains newlines where the source has spaces.
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const bouncedHome = body.includes(HOME_HERO);
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

    if (bouncedHome) fail(`deep link ${path}`, 'homepage hero is on screen');
    else pass(`deep link ${path} did not fall back to the homepage`);
  } finally {
    await page.close();
  }
}

/**
 * A fresh browser context with the fixtures every check needs. `user` seeds a
 * session before any app script runs; omit it for the signed-out checks, which
 * must start with no session or the /dashboard guard would have nothing to
 * reject.
 */
async function createContext(browser, { user = null } = {}) {
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
    // Signed out: the public deep links, plus the guard that must stop a visitor
    // reaching a business page.
    const signedOut = await createContext(browser);
    try {
      await checkDeepLink(signedOut, { path: `/listings/${LISTING_ID}`, heading: LISTING_NAME });
      await checkDeepLink(signedOut, { path: `/c/${CATEGORY_SLUG}`, heading: CATEGORY_HEADING });
      await checkDeepLink(signedOut, {
        path: '/dashboard',
        expectedPath: '/login',
        heading: LOGIN_HEADING,
      });

      // Unknown IDs and slugs are the other way a deep link can regress: the
      // page must admit it has nothing to show, at the URL the visitor used,
      // instead of redirecting to the homepage.
      // ListingDetail's empty state is an h2, not an h1, so the level is named
      // rather than the assertion being loosened to any heading.
      await checkDeepLink(signedOut, {
        path: '/listings/does-not-exist',
        heading: NOT_FOUND_HEADING,
        headingTag: 'h2',
        expectedText: LISTING_NOT_FOUND_LINK,
      });
      await checkDeepLink(signedOut, {
        path: '/c/not-a-category',
        heading: NOT_FOUND_HEADING,
        expectedText: CATEGORY_NOT_FOUND_LINK,
      });
    } finally {
      await signedOut.close();
    }

    // Signed in as an administrator, so /admin exercises the page itself rather
    // than being bounced to the login guard.
    const admin = await createContext(browser, { user: ADMIN_USER });
    try {
      await checkDeepLink(admin, {
        path: '/admin',
        heading: 'Town Administrator Console',
      });
    } finally {
      await admin.close();
    }

    // The guard must not over-block: the same URL, now as the owner it exists
    // for, has to stay put and render the business dashboard.
    const owner = await createContext(browser, { user: BUSINESS_USER });
    try {
      await checkDeepLink(owner, { path: '/dashboard', heading: DASHBOARD_HEADING });
    } finally {
      await owner.close();
    }
  } finally {
    await browser.close();
  }
}

const watchdog = setTimeout(() => {
  console.error('FAIL: smoke test timed out');
  process.exit(1);
}, 60_000);

server.on('error', (error) => {
  console.error(`FAIL: could not serve dist on ${PORT} — ${error.message}`);
  process.exit(1);
});

server.listen(PORT, async () => {
  try {
    for (const route of routes) await checkHttp(route);
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
