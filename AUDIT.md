# TownPulse — Site Audit (pre-rebuild)

Audit date: 2026-10-01
Audited: `frontend/` (React 18 + Vite 5 SPA), `backend/` (FastAPI + SQLAlchemy + PostGIS)

Severity: **P0** blocks task completion / destroys trust · **P1** major UX, SEO or a11y defect ·
**P2** polish and consistency · **P3** nice to have.

**Status column.** ✅ = fixed and verified in CI · 🟡 = partially fixed ·
⬜ = still open. A finding is only marked ✅ when something enforces it — a test,
a build step, or a validator that exits non-zero — not merely when the code
changed.

---

## 1. Rendering & content delivery

| # | Sev | Status | Finding | Impact | Fix |
|---|---|---|---|---|---|
| 1.1 | **P0** | ✅ | Whole app renders client-side only. `index.html` ships an empty `<div id="root">`; no SSR, no static generation. | Without JS, on a crawler, or mid-load failure the visitor sees a blank page. Fatal for the stated audience (stressed, in a hurry, slow 3G). | `scripts/prerender.mjs` writes 181 static pages at build time. React still hydrates over them, so this is progressive enhancement, not a second renderer. |
| 1.2 | **P0** | ✅ | No `<noscript>` block anywhere. | No graceful degradation path at all. | Inline, dependency-free `<noscript>` panel in `index.html` leading with emergency numbers. Inline styles so it survives a failed CSS load. |
| 1.3 | **P1** | 🟡 | Suspense fallback is a centred spinner for every route. | A spinner communicates nothing and reads as "broken" on slow connections. | Content-shaped skeletons mirroring final layout. `.tp-skeleton` exists and is now correctly nested, but `LoadingSpinner` is still the route fallback. |
| 1.4 | **P1** | `AnimatedBackground` plus ~20 looping keyframe animations (`aurora`, `beam`, `glowPulse`, `shine`, `heartbeat`) run on the home page. | Continuous animation burns battery and main-thread time on low-end Android — the actual target device. | Remove ambient loops above the fold; keep only short purposeful transitions. |

## 2. Information architecture

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 2.1 | **P0** | No named town or region anywhere. Copy says "small towns", "your town". `DEFAULT_MAP_LAT/LNG` hardcoded to Bengaluru (12.9716, 77.5946) in `backend/app/core/config.py`. | Site cannot answer "is this near me?" — its core job. Reads as an unfinished demo. | Single source of truth for town identity, surfaced in header, hero, titles, JSON-LD, footer. |
| 2.2 | **P0** | No Emergency page. Emergency exists only as `EmergencyAlertBanner` fed by admin alerts. | The highest-stakes task is not reachable in one tap from anywhere. | `/emergency` route, one tap from persistent header on every page, precached offline. |
| 2.3 | **P1** | No category pages; categories exist only as filter chips on home. | No shareable/indexable category URL. Cannot send "the mechanics in town" to a neighbour. | `/c/:slug` routes with own title, description, canonical, JSON-LD. |
| 2.4 | **P1** | No `/report` route. Reporting is an inline toggle form on listing detail. | Hard to reach, not shareable, not linkable from a card. | Global `/report` route plus persistent per-listing action. |
| 2.5 | **P2** | `SearchBar` is a plain submit form with no suggestions. | Not "instant search"; every query is a round trip. | Debounced instant search with results dropdown and keyboard navigation. |
| 2.6 | **P2** | `Header` is 16 KB and fetches categories + 100 listings whenever the print button is opened. | Slow first interaction on the most important element on the page. | Slim header; lazy-load print data only on open. |

## 3. Design system & identity

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 3.1 | **P0** | Default Tailwind blue `#2563eb` is the brand. `tailwind.config.js` copies the stock `brand` scale; `theme-color`, `manifest.json`, `globals.css` pin `#2563eb`/`ring-blue-500`. | Reads as an unstyled starter template, not a civic service. Contradicts the warm, trustworthy civic brief. | Warm distinctive civic palette as CSS custom properties, light + dark; Tailwind remapped to tokens. |
| 3.2 | **P1** | No design tokens. Colours, radii (`rounded-2xl`), shadows, durations hardcoded across ~40 files. | Impossible to change theme or meet contrast requirements consistently. | Token layer: palette, type scale, 8px spacing, radius, elevation, motion. |
| 3.3 | **P1** | No typeface declared at all; no font is loaded. `font-sans` resolves to the Tailwind system stack. | No typographic identity, no consistent render across devices. | One display + one body face with explicit fallback stacks and `font-display: swap`. |
| 3.4 | **P2** | `globals.css` is ~520 lines mixing tokens, component styles and ~25 hand-written `@keyframes`. | Motion defined in three places (Tailwind config, CSS, React). | Split into `tokens.css`, `base.css`, `components.css`, `leaflet.css`, `print.css`. |
| 3.5 | **P2** | Emoji used as category icons (`🏥`, `🔧`, `🚑`) in seed data, rendered as UI. | Inconsistent across platforms, no accessible label, looks unfinished. | Inline SVG icon set keyed to category slug. |
## 4. Data quality & trust

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 4.1 | **P0** | "Verified" asserted with **no visible verification process**. `ListingDetail` renders "Verified Official Listing"; `Footer` renders "Verified Civic Data". Neither links to an explanation. | Unsupported trust claim on the highest-stakes content. Tells anxious users to trust an unauditable badge. | Publish `/about#how-we-verify` with the exact procedure; render provenance + verification date on every listing. |
| 4.2 | **P0** | `seed_data.json` contains **invented** businesses — "Town Primary Health Centre", "Dr. Rao Dental Clinic", "Arogya Diagnostic" — with made-up phone numbers and emails, all `"verified": true`. | Fabricated contact details for health services presented as verified. Actively harmful. | Replace with real OSM data; mark unverified; never assert verification that has not happened. |
| 4.3 | **P0** | Verification state is a single boolean. No `verified_by`, `last_verified_at`, `source` or `status` on the API schema. | Cannot answer "who checked this and when?" — the only question that makes a badge meaningful. | Add `source`, `source_url`, `verified_by`, `last_verified_at`, `status`, `services`, `languages`. |
| 4.4 | **P1** | `getOpenStatus()` returns `isOpen: true` when hours are **absent or unparseable** (`statusText: 'Hours not specified'`). | Listings with no data are silently presented as **Open Now**. Dangerous in an emergency, and it silently breaks the "open now" filter. | Return a distinct `unknown` state; never render unknown as open. |
| 4.5 | **P1** | `getOpenStatus()` splits on `/[-–—to]/i`, which mangles `"10:00-12:00, 16:00-19:00"` and any text containing "to". | Wrong open/closed answers. | Reuse the backend's OSM-aware `normalize_hours()` parser instead of a second divergent implementation. |
| 4.6 | **P1** | `config.py` hardcodes `TZ_OFFSET_MINUTES: int = 330` and Bengaluru map defaults, separate from any town concept. | "Open now" computed in the wrong timezone for any other town. | Derive timezone and map centre from town configuration. |
| 4.7 | **P2** | Mojibake icons in `seed_data.json`; encoding artefacts in `import_osm.py` comments. | Visible garbage in the UI. | UTF-8 throughout; generate the file programmatically. |

## 5. SEO & sharing

| # | Sev | Status | Finding | Impact | Fix |
|---|---|---|---|---|---|
| 5.1 | **P0** | ✅ | **No `og:image`** anywhere. `index.html` sets `og:title`/`og:description`/`og:type` but no image. | Every WhatsApp/Facebook share is a bare text link — fatal for a product whose distribution strategy is "forward this to a neighbour". | `scripts/generate-og.mjs` renders 179 cards (1 homepage, 8 categories, 170 listings) at 1200×630 from `tokens.css`. |
| 5.2 | **P0** | ✅ | **No canonical URLs** on any route. | Duplicate-content risk; no control over which URL is indexed. | Emitted per route from one `site.url`, at build time and again at runtime by `applySeo`. Covered by `seo.test.ts`. |
| 5.3 | **P0** | ✅ | **No `sitemap.xml`, no `robots.txt`.** | Search engines have no map of the site. | `scripts/generate-sitemap.mjs` derives 188 URLs from routes that actually exist, so the sitemap cannot advertise a 404. |
| 5.4 | **P1** | ✅ | No `twitter:*` card tags. | Twitter/X falls back to a plain link. | `twitter:card/title/description/image` emitted alongside the `og:*` set. |
| 5.5 | **P1** | ✅ | `useSeo` sets only `title`, `description`, `og:title`, `og:description`. Never canonical, `og:url`, `og:type`, `og:image`, `hreflang`. | Every page shares the homepage's social preview. | `hooks/useSeo.ts` now owns every head tag, including `hreflang` per registered language. 12 tests cover it. |
| 5.6 | **P1** | ✅ | JSON-LD is static: generic `WebSite` + `Organization`. No `LocalBusiness`/`MedicalClinic` on listings. `SearchAction.target` is `/?q={...}`, which does not match how search works. | Loses rich results for local businesses — the exact entities users search for. | `listingJsonLd()` emits `LocalBusiness` with geo, address and `areaServed`; `telephone` is omitted rather than invented. `SearchAction.target` now absolute. |
| 5.7 | **P2** | Deployed on the default Vercel subdomain; no custom-domain config. | Reads as a demo; blocks HSTS/cookie scoping on a real domain. | Configurable `site.url`; canonicals and sitemap derive from it; deployment documented. |
## 6. Accessibility

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 6.1 | **P0** | Touch targets far below 44×44 px. `ListingCard` action buttons are `p-2` + `w-3.5 h-3.5` icon ≈ **28 px**. Header icon buttons similar. | WCAG 2.2 AA **2.5.8 Target Size (Minimum)** failure — a real problem for the stated audience. | Minimum 44×44 hit area on every control, verified at 375 px. |
| 6.2 | **P1** | Status conveyed largely by colour: `OpenStatusBadge` is an emerald/rose pill + coloured dot with a ping animation. | WCAG **1.4.1 Use of Color**. | Every badge pairs icon + text with colour; colour never the sole carrier. |
| 6.3 | **P1** | No `aria-live` region for search results or filter changes. | Screen-reader users get no feedback that results changed. | Polite live region announcing result counts. |
| 6.4 | **P1** | Mobile menu opens as a plain `<div>`: no focus trap, no Escape handling, no `aria-expanded`/`aria-controls`. | Keyboard and SR users tab into content behind the overlay. | Proper disclosure semantics, Escape to close, focus management, 44 px toggle. |
| 6.5 | **P1** | Decorative `AnimatedBackground` is not `aria-hidden`; `ScrollProgressBar` has no accessible equivalent. | Meaningless announcements. | Mark decorative motion `aria-hidden`. |
| 6.6 | **P2** | Bookmark button `aria-label="Toggle favorite bookmark"` is identical saved or not. | Users cannot tell state. | `aria-pressed` with a state-specific label. |
| 6.7 | **P2** | `prefers-reduced-motion` is honoured (good), but ~15 named keyframe animations remain enabled by default. | Partial mitigation only. | Reduce the motion vocabulary as part of the redesign. |

## 7. Performance

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 7.1 | **P0** | Leaflet CSS is loaded render-blocking from `unpkg.com` in `<head>`, on the critical path of every page. | Third-party round trip before first paint on slow 3G. Directly contradicts the brief. | Bundle Leaflet CSS locally; load only on map routes. |
| 7.2 | **P1** | `leaflet`, `leaflet.markercluster`, `react-leaflet-cluster` are pulled into the shared graph; the home page ships a map preview. | ~150 KB map library on the landing page, which does not need it. | Lazy-load the map; drop marker clustering. |
| 7.3 | **P1** | Listing images use a bare `<img>` — no `loading="lazy"`, no `decoding="async"`, no `width`/`height`. | Layout shift and eager loading across the results grid. | Explicit dimensions, lazy loading, async decoding. |
| 7.4 | **P2** | PWA `runtimeCaching` regex is malformed: `/^https:\/\/.*\/listings\|...\|\/api\/(listings\|categories)/`. | Alternation binds loosely, so it will not match production requests — the offline cache silently fails where it is needed. | Anchor and group the patterns correctly. |
| 7.5 | **P2** | `sw.ts` registers a service worker in addition to `vite-plugin-pwa`'s generated one. | Two workers can fight over the same scope. | Single registration path via the PWA plugin. |
## 8. Error, loading & empty states

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 8.1 | **P0** | API failures swallowed with `.catch(console.error)` in `Home`, `Header` and elsewhere; home then renders "No local services found matching your criteria." | A server outage is shown as an empty result set — actively misleading, and it destroys trust. | Distinct `error` state with retry, separate from the genuine empty state. |
| 8.2 | **P1** | The only empty state is one sentence plus a "Submit a Service" link. | Does not help the user do what they came to do. | Helpful empty states: echo the query, offer nearest categories, widen the radius, suggest a listing. |
| 8.3 | **P1** | `alert()` used for geolocation errors and report submission. | Blocking, unstyled, untranslatable. | Inline `role="alert"` messaging. |
| 8.4 | **P2** | `ErrorBoundary` is generic; no offline differentiation. | | Distinguish offline / server error / unexpected. |

## 9. Internationalisation

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 9.1 | **P0** | `src/i18n/hi.json` is fully translated but `src/i18n/index.ts` registers **only `en`**; `lng` is hardcoded `'en'`. | The Hindi translation is dead code. | Register all languages, detect and persist preference, expose a switcher. |
| 9.2 | **P1** | Most copy is hardcoded English inside components (`"View Details →"`, `"Open Now"`, `"Search"`, the whole header menu, the whole footer). | The i18n layer is decorative; translation is impossible without touching every component. | Move all copy into catalogues. |
| 9.3 | **P1** | `<html lang="en">` never updates on language change. | Screen readers announce content in the wrong language. | Sync `lang`/`dir` on change. |
| 9.4 | **P2** | No `hreflang` alternates. | | Emit per-locale alternates alongside canonicals. |

## 10. Code quality

| # | Sev | Finding | Impact | Fix |
|---|---|---|---|---|
| 10.1 | **P1** | `ListingCard` wraps a `<div>` containing one `<Link>` for the name and another for "View Details" — two competing click targets for one destination. | Confusing for keyboard users; whole-card click unavailable. | One primary link, one card, predictable tab order. |
| 10.2 | **P1** | Open/closed logic duplicated: `businessHours.ts` (frontend) and `hours_service.py` (backend) implement different parsers. | Guaranteed divergence; fixes miss one side silently. | One shared parsing contract, tested on both sides. |
| 10.3 | **P2** | Tests exist for components but none for the rules that decide whether a listing is trustworthy. | | Tests for verification and open/closed edge cases. |
| 10.4 | **P2** | Oversized mixed-responsibility components: `ListingDetail.tsx` 22 KB, `AdminDashboard.tsx` 19 KB, `MapView.tsx` 17 KB, `Header.tsx` 16 KB. | | Decompose during the rebuild. |

---

## Summary

The site is a well-engineered prototype with a genuinely strong backend — PostGIS geo search,
decaying verification scoring, an audit trail, business claims, offline PWA scaffolding. Its
failure is concentrated entirely in the **presentation and delivery layer**:

- **Rendering & trust (P0)** — blank page without JS; no town name; a "verified" badge with no
  verification process behind it; fabricated clinic data; no `og:image`, canonical or sitemap.
- **Identity & accessibility (P0)** — default Tailwind blue; sub-44 px touch targets; the shipped
  Hindi translation is not registered.
- **The error model actively misinforms** — API failures render as "no results", and listings with
  no hours data render as "Open Now".

Rebuild order adopted: **rendering & trust → identity & accessibility → data → discovery → SEO →
polish.**

---

## Addendum — defects found while shipping the fixes

Two problems were discovered *during* the rebuild work above. Both were silent:
the build succeeded and the tests passed in each case.

### `base.css` was structurally corrupted

Three blocks were missing a closing brace, so CSS nesting reinterpreted
everything after them. The compiled stylesheet contained selectors like:

```css
.tp-btn-secondary:hover:not(:disabled) .tp-badge { … }
.tp-skeleton::after .tp-prose { … }
```

In other words `.tp-badge` only matched *inside a hovered secondary button*,
and the prose, skeleton-shimmer and button-variant rules were all swallowed into
unrelated parents. Anything rendering those classes was effectively unstyled.

Fixed by restoring the three braces and re-nesting the orphaned rules. Verified
in the compiled output: `.tp-badge`, `.tp-prose`, `.tp-btn-accent` and
`.tp-skeleton::after` now emit as flat selectors.

**Worth a CI check.** Nothing currently parses `base.css` structurally. A cheap
guard would be a brace-balance or PostCSS parse assertion.

### `/emergency`, `/categories` and `/c/:slug` have no React route

`prerender.mjs` emits static HTML for these paths, and the sitemap lists them,
but `App.tsx` has no matching `<Route>`. A visitor who *navigates* client-side
to `/c/healthcare` therefore sees the 404 page, while a crawler or a cold page
load sees real content.

This is the single highest-value remaining task: it is a small addition to
`App.tsx` plus header/footer links, and it removes an inconsistency where the
same URL shows two different pages depending on how it was reached.