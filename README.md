<p align="center">
  <img src="https://img.shields.io/badge/TownPulse-Local%20Services%20Finder-blue?style=for-the-badge" alt="TownPulse Badge" />
</p>

<h1 align="center">🏘️ TownPulse</h1>
<p align="center">
  <strong>The community-first local resource & services finder for small towns</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-docs">API Docs</a> •
  <a href="./DEPLOYMENT.md">Deployment Guide</a> •
  <a href="./SECURITY.md">Security</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Tests-26%20Passed-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 📌 Rebuild status (read this first)

TownPulse is mid-rebuild from a prototype into a production site. This section
is the honest map of what is done and what is not.

| Phase | Status |
|---|---|
| 1. Audit | ✅ [`AUDIT.md`](./AUDIT.md) — 40 findings, severity-ranked |
| 2. Design system | ✅ "Clay & Teak" token layer, 36/36 contrast checks pass |
| 4. Data integrity | ✅ Fabricated seed removed; 170 real OSM listings, all honestly `unverified` |
| 7. i18n (registration) | ✅ All languages registered + language switcher plumbing |
| 6. Performance / SSG | ✅ Build-time static generation — 181 pre-rendered pages + a real `<noscript>` fallback |
| 8. SEO / sharing | ✅ 179 `og:image` cards, canonicals, `sitemap.xml`, `robots.txt`, per-listing JSON-LD |
| 3. Information architecture | ⏳ Partial — `/emergency` and `/c/:slug` are pre-rendered, but not yet React routes |
| 5. Discovery | ⏳ Not started |
| 7. Accessibility | ⏳ Partial — tokens and focus done, components not yet migrated |
| 9. Polish | ⏳ Not started |
| 10. Verification | ✅ build, typecheck, contrast and 55 unit tests all green |

See [`AUDIT.md`](./AUDIT.md) for the full defect list and
[`DATA_NEEDED.md`](./DATA_NEEDED.md) for the data you must collect.

> **The three most important open items**, in order:
> 1. `/emergency`, `/categories` and `/c/:slug` exist as static HTML but have
>    **no React route yet**, so navigating to them client-side renders the 404
>    page. The header and footer must link to them.
> 2. Migrating the remaining components from hardcoded Tailwind blue and
>    hardcoded English onto the new token and catalogue layers.
> 3. A Kannada (`kn.json`) translation. `kn` is registered but inherits English,
>    so a Kannada speaker gets a mostly-English page.

---

## 🎨 Design system

All colour, type, spacing, radius, elevation and motion live in CSS custom
properties in [`frontend/src/styles/tokens.css`](./frontend/src/styles/tokens.css).
Components never hardcode a hex value.

**Identity: "Clay & Teak"** — a warm terracotta primary with deep pine for care
and civic trust. Deliberately not blue: blue reads as generic SaaS, and this is
a public service.

```bash
cd frontend
npm run validate:contrast   # checks every text/background pair against WCAG 2.2 AA
npm run typecheck
```

The contrast validator parses `tokens.css` directly and exits non-zero on any
failure, so a palette regression is caught in CI rather than by a user.

### Retuning the identity

Change the hex values in `tokens.css` — light and dark are separate blocks — and
run `npm run validate:contrast`. The dark theme is a re-tuned palette, not an
inversion, so both blocks need editing.

---

## 🔎 SEO and static generation

Everything below is produced at build time by `npm run build`. There are no
runtime image or sitemap services, and nothing needs a headless browser.

| Script | Output | Why |
|---|---|---|
| `generate:og` | `public/og/*.png` + `manifest.json` | One 1200×630 share card per listing, per category and for the homepage |
| `generate:sitemap` | `public/sitemap.xml`, `public/robots.txt` | 188 URLs derived from routes that actually exist |
| `generate:prerender` | `dist/**/index.html` | 181 static pages: real content for crawlers and no-JS visitors |

Three things worth knowing before you change these:

- **Order matters.** OG images and the sitemap are written into `public/`, which
  Vite copies into `dist/`. They are generated in a `prebuild` hook for exactly
  this reason — running them after `vite build` shipped a `dist/` with no images
  at all, and every share silently 404'd.
- **Glyph widths are measured, not estimated.** The card renderer calibrates real
  advance widths by rendering the alphabet and scanning the ink, because an
  estimated width ratio overflowed long place names off the edge of the card.
- **The `SEO:START` / `SEO:END` markers in `index.html` are load-bearing.** The
  prerenderer splices between them. Deleting them fails the build loudly rather
  than silently shipping duplicate `<title>` and `og:` tags.
- **Share images are optional at build time.** `generate:og` needs `sharp`, a
  native module requiring Node >= 20.9 and a per-platform prebuilt binary. If it
  is unavailable on the build host the script warns and exits 0 rather than
  failing the deployment — `public/og/home.png` is committed for exactly that
  case, so every page still has a valid `og:image`.

### Retargeting to another town

Edit `frontend/src/config/site.defaults.json` (shared by the app and the build
scripts), set `VITE_SITE_URL`, then rebuild. The sitemap, share cards and
pre-rendered pages all regenerate from it.

---

## 🗺️ Targeting a town

Town identity is configured in one place:
[`frontend/src/config/site.ts`](./frontend/src/config/site.ts) (name, region,
district, map centre, timezone, emergency numbers) and mirrored in the backend
`.env`. Full instructions are in [`DATA_NEEDED.md`](./DATA_NEEDED.md) §5.

The current default is **Hampi, Vijayanagara district, Karnataka**.

---

## 🚨 Data honesty

The previous seed file contained invented clinics, mechanics and diagnostics
with made-up phone numbers, all marked `verified: true`. Fabricated contact
details for health services is the most harmful thing this project could ship.

It has been replaced with real OpenStreetMap data. Every listing now carries:

```json
{
  "verified": false,
  "status": "unverified",
  "source": "openstreetmap",
  "source_url": "https://www.openstreetmap.org/node/4550586390"
}
```

Regenerate for any town:

```bash
cd backend
python scripts/import_osm.py --lat <lat> --lng <lng> --radius 6000
python scripts/build_seed_from_osm.py seed/_osm_raw_<town>.json
```

The second command prints a coverage report — how many listings still need a
phone number, opening hours or an address.

---

## 🎯 Problem Statement

In small towns and rural communities, finding reliable local services — clinics, mechanics, volunteer orgs, shelters, grocery stores — is surprisingly hard. Google Maps is incomplete, Yelp doesn't cover small towns, and word-of-mouth doesn't scale.

**TownPulse** solves this by providing a verified, community-moderated, privacy-first directory of local services with map-based discovery, business claiming, and admin workflows.

## 🏆 Why TownPulse?

| Feature | Google Maps / Generic | TownPulse |
|---|---|---|
| **Data ownership** | Provider-controlled | You own all data |
| **Verification** | Opaque moderation | Claim + OTP + proof + admin approval |
| **Custom workflows** | Fixed schema | Events, volunteers, shelters, custom types |
| **Privacy & offline** | Data collected by provider | Self-hosted, PWA offline caching |
| **Cost** | Escalating API fees | OpenStreetMap + self-hosted = predictable |
| **Moderation** | Community edits | Local admin moderation with audit trails |
| **Analytics** | Limited insights | Built-in search trends and contact analytics |

## ✨ Features

- 🗺️ **Map-based discovery** — Leaflet + OpenStreetMap with clustering and radius search
- 🔍 **Smart search** — Full-text search with category filters and geospatial queries (PostGIS)
- ✅ **Verified listings** — Business owners claim listings with OTP + proof upload + admin review
- 📱 **PWA support** — Offline caching for low-connectivity rural areas
- 🔐 **Privacy-first** — Self-hosted, JWT auth, no third-party tracking
- 👤 **Role-based access** — Users, business owners, and admins with distinct dashboards
- 📊 **Analytics** — Search trends, contact clicks, and claim metrics for local leaders
- 🌐 **i18n ready** — English + Hindi (easily extensible)
- ♿ **Accessible** — WCAG AA focus rings, keyboard navigation, ARIA labels, skip links
- 🐳 **Docker-ready** — One command to start everything locally or in production

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        TownPulse Architecture                    │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │   Frontend   │    │   Backend    │    │   Infrastructure   │  │
│  │              │    │              │    │                    │  │
│  │  React 18    │───▶│  FastAPI     │───▶│  PostgreSQL        │  │
│  │  TypeScript  │    │  Python 3.11 │    │  + PostGIS         │  │
│  │  Vite        │    │  SQLAlchemy  │    │                    │  │
│  │  Tailwind    │    │  Alembic     │    │  Redis             │  │
│  │  Leaflet     │    │  JWT Auth    │    │  (OTP + cache)     │  │
│  │  PWA         │    │  Pydantic    │    │                    │  │
│  │              │    │              │    │  Nginx (prod)      │  │
│  └─────────────┘    └──────────────┘    └────────────────────┘  │
│         :3000              :8000                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🚀 Quickstart

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Git](https://git-scm.com/)

### Clone and run

```bash
# Clone the repository
git clone https://github.com/R0HITHRAO/Townpulse.git
cd Townpulse

# Copy environment variables
cp .env.example .env
# Edit .env with your values (defaults work for local dev)

# Start everything (backend, frontend, postgres, redis)
# Linux / macOS:
make dev

# Windows PowerShell:
.\dev.ps1

# In another terminal: seed the database with 50 sample listings
# Linux / macOS:
make seed
# Windows:
.\dev.ps1 seed

# Open the app
# Frontend: http://localhost:3000
# Backend API docs: http://localhost:8000/docs
# Health check: http://localhost:8000/health
```

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@townpulse.dev` | `Admin123!` |
| Business Owner | `owner@townpulse.dev` | `Owner123!` |

### Run tests

```bash
# Backend pytest suite (15 tests)
docker compose exec backend pytest -v

# Frontend Vitest suite (11 tests)
cd frontend && npm test
```

## 🚢 Production Deployment

For complete zero-configuration step-by-step instructions on deploying the frontend to **Vercel** and backend to **Render**, please see the [**Production Deployment Guide (DEPLOYMENT.md)**](./DEPLOYMENT.md).

---

## 📁 Repository Structure

```
townpulse/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, listings, admin, health)
│   │   ├── core/         # Config, security, database, dependencies
│   │   ├── models/       # SQLAlchemy models (User, Listing, Claim, etc.)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic (auth, listings, claims, OTP)
│   │   ├── tasks/        # Celery background tasks (optional)
│   │   └── main.py       # FastAPI app factory
│   ├── alembic/          # Database migrations
│   ├── tests/            # Pytest test suite
│   ├── scripts/          # Seed, backup scripts
│   ├── seed/             # Sample data (50 listings)
│   ├── Dockerfile        # Multi-stage production build
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API client and auth helpers
│   │   ├── i18n/         # Internationalization (en, hi)
│   │   └── styles/       # Tailwind globals
│   ├── public/           # Static assets, PWA manifest
│   ├── Dockerfile        # Production build
│   ├── vercel.json       # Vercel SPA rewrites
│   └── vite.config.ts
├── infra/
│   ├── docker-compose.yml      # Full-stack dev compose
│   ├── docker-compose.prod.yml # Production compose
│   └── nginx/                  # Reverse proxy config
├── .github/
│   ├── workflows/ci.yml       # CI pipeline
│   ├── ISSUE_TEMPLATE/        # Bug & feature request templates
│   └── PULL_REQUEST_TEMPLATE.md
├── render.yaml                 # One-click Render deployment blueprint
├── DEPLOYMENT.md               # Production deployment guide
├── SECURITY.md                 # Security & vulnerability reporting policy
├── .env.example
├── Makefile
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register with email/password | Public |
| `POST` | `/auth/login` | Login → JWT | Public |
| `POST` | `/auth/otp/request` | Request phone OTP | Public (rate limited) |
| `POST` | `/auth/otp/verify` | Verify OTP → JWT | Public |
| `POST` | `/auth/refresh` | Refresh access token | JWT |
| `GET` | `/categories` | List all categories | Public |
| `GET` | `/listings` | Search listings (query, category, lat/lng/radius) | Public |
| `GET` | `/listings/{id}` | Listing details | Public |
| `POST` | `/listings` | Submit new listing | Auth |
| `PUT` | `/listings/{id}` | Edit listing | Owner/Admin |
| `POST` | `/listings/{id}/claim` | Claim a listing | Auth |
| `POST` | `/listings/{id}/report` | Report a listing | Auth |
| `GET` | `/admin/listings/pending` | Pending submissions | Admin |
| `POST` | `/admin/listings/{id}/verify` | Verify a listing | Admin |
| `GET` | `/admin/claims/pending` | Pending claims | Admin |
| `POST` | `/admin/claims/{id}/approve` | Approve claim | Admin |
| `POST` | `/admin/claims/{id}/reject` | Reject claim | Admin |
| `GET` | `/admin/analytics` | Basic stats | Admin |
| `GET` | `/health` | Health check | Public |
| `GET` | `/metrics` | Prometheus metrics | Public |

Full interactive API documentation available at `http://localhost:8000/docs` (Swagger UI).

## 🔒 Security

- **JWT Authentication** — Short-lived access tokens + refresh tokens
- **Password hashing** — Native bcrypt with salt
- **OTP rate limiting** — Max 5 requests per phone per hour via Redis
- **Rate limiting** — Redis-backed middleware on all endpoints
- **CORS** — Configured for production & development origins
- **Input validation** — Pydantic schemas on all endpoints
- **Secrets management** — All secrets via environment variables
- See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `chore:` — Maintenance
- `test:` — Tests

## 📄 License

[MIT](LICENSE) — Free for personal and commercial use.

---

<p align="center">
  <strong>TownPulse maps the heartbeat of your town</strong> — verified listings, owner claims, and admin moderation in a privacy-first, offline-capable app that gives communities control of their local data and workflows.
</p>
