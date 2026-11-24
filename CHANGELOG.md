# Changelog

All notable changes to TownPulse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**No release has been cut yet** — there are no tags or GitHub Releases — so
everything below sits under `[Unreleased]`, and `main` is the only long-lived
branch.

## [Unreleased]

### Added

**Backend**
- FastAPI + SQLAlchemy + Alembic service on PostgreSQL/PostGIS: `ST_DWithin`
  radius search and `tsvector` full-text search
- JWT auth (short-lived access tokens + refresh) with phone-OTP login and bcrypt
  password hashing
- Listing submission, owner claims (OTP + proof upload + admin review) and
  reporting, with an admin audit trail
- Admin moderation and analytics endpoints; business-owner dashboard
- Redis-backed OTP rate limiting (5 requests/hour/phone) and API rate limiting
- Structured JSON logging with request IDs; `/health` and `/metrics`

**Frontend**
- React 18 + Vite + TypeScript SPA with Leaflet/OpenStreetMap discovery,
  radius search and category filters
- Installable PWA with offline caching
- "Clay & Teak" design-token layer covering colour, type, spacing, radius,
  elevation and motion, with `npm run validate:contrast` enforcing WCAG 2.2 AA on
  every text/background pair and failing the build on a palette regression
- Build-time SEO from routes that actually exist: per-route canonicals,
  `og:`/`twitter:` tags, generated 1200×630 share cards, `sitemap.xml`,
  `robots.txt` and per-listing `LocalBusiness`/`MedicalClinic` JSON-LD
- Static pre-rendering of shareable routes plus a dependency-free `<noscript>`
  fallback, so the site is readable without JavaScript
- `/emergency`, `/categories` and `/c/:slug` routes, with a route-parity test
  that fails if a route the sitemap advertises loses its React counterpart
- i18n catalogues with every registered language exposed through the language
  switcher
- OpenStreetMap import (`backend/scripts/import_osm.py`) and an area-specific
  seed builder (`backend/scripts/build_seed_from_osm.py`); operator seed files
  are git-ignored so one area's records cannot become another area's default

**CI**
- Blocking lint and type checks: ruff, black, isort (black profile), mypy,
  ESLint and `tsc`
- Unit suites for backend (pytest) and frontend (Vitest), plus validators for
  design-system contrast, stylesheet structure, i18n key coverage and the
  `vercel.json` schema
- Browser-driven deep-link smoke test and Docker image builds for both services

### Changed
- `main` is the only long-lived branch: the `develop` integration branch was
  removed and pull requests target `main`
- A defect counts as fixed only when something enforces it — a test, a build
  step or a validator that exits non-zero — not merely when the code changed;
  see `AUDIT.md` for the current list and statuses

### Fixed
- Blank page for crawlers, no-JS visitors and mid-load failures: the site is
  pre-rendered at build time and degrades to a readable `<noscript>` panel that
  leads with emergency numbers
- Every share was a bare text link: routes now ship canonical URLs, `og:image`
  cards and a sitemap generated from the routes that exist
- The completed Hindi catalogue was registered but never loaded; every language
  in `src/i18n` is now registered and switchable
- Shareable routes that served real HTML to crawlers returned 404 on client-side
  navigation; route parity between `App.tsx` and the advertised routes is now
  enforced by a test
- A structurally corrupted `base.css` (three missing closing braces) silently
  nested unrelated rules inside hover selectors; the stylesheet is now parsed in
  CI so a brace imbalance fails the build

### Removed
- Fabricated seed listings — invented clinics, mechanics and diagnostics with
  made-up phone numbers and emails, all marked `verified: true`
- Bundled location extracts and the hardcoded Bengaluru map default: no location
  is selected until a visitor or operator explicitly chooses one
- The "50 sample listings" seed this changelog used to promise; imported
  OpenStreetMap records are `verified: false`, `status: "unverified"` and carry
  `source`/`source_url`, and are not claims that this project has checked them

## Release Process

1. Move the `[Unreleased]` entries into a new version heading with the date
2. Bump the version in `backend/app/core/config.py`
3. Open a PR against `main` (there is no `develop` branch) and merge it once CI
   is green
4. Tag the release: `git tag -a v0.x.0 -m "Release v0.x.0"`
5. Push the tag: `git push origin v0.x.0`
6. GitHub Actions builds and publishes the Docker images
7. Create a GitHub Release using the changelog section for that version

## Versioning

- **Major** (1.x.x) — Breaking API changes or major feature rework
- **Minor** (x.1.x) — New features, backward compatible
- **Patch** (x.x.1) — Bug fixes, minor improvements

[Unreleased]: https://github.com/R0HITHRAO/Townpulse/commits/main
