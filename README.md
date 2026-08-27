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
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

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
- ♿ **Accessible** — WCAG basics, keyboard navigation, ARIA labels, skip links
- 🐳 **Docker-ready** — One command to start everything locally

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
make dev

# In another terminal: seed the database with 50 sample listings
make seed

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
make test          # Run all tests (backend + frontend)
make test-backend  # Backend tests only
make test-frontend # Frontend tests only
```

### Build production images

```bash
make build
```

### Deploy (single Docker container)

```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
```

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
│   └── vite.config.ts
├── infra/
│   ├── docker-compose.yml      # Full-stack dev compose
│   ├── docker-compose.prod.yml # Production compose
│   └── nginx/                  # Reverse proxy config
├── .github/
│   ├── workflows/ci.yml       # CI pipeline
│   ├── ISSUE_TEMPLATE/        # Bug & feature request templates
│   └── PULL_REQUEST_TEMPLATE.md
├── .env.example
├── Makefile
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md               # ← You are here
```

## 🗄️ Database Schema

- **users** — UUID PK, email, phone, role (user/business_owner/admin), password hash
- **categories** — Serial PK, name, icon
- **listings** — UUID PK, name, category, description, address, PostGIS geography point, phone, email, website, hours (JSON), verified flag, owner FK, full-text search vector
- **claims** — UUID PK, listing FK, user FK, status (pending/approved/rejected), proof URL
- **submissions** — UUID PK, submitted data (JSONB), status, user FK
- **reviews** — UUID PK, listing FK, user FK, rating, comment
- **analytics** — UUID PK, event type, payload (JSONB)

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
- **Password hashing** — bcrypt with salt
- **OTP rate limiting** — Max 5 requests per phone per hour via Redis
- **Rate limiting** — Redis-backed middleware on all endpoints
- **CORS** — Restricted to allowed origins
- **Input validation** — Pydantic schemas on all endpoints
- **Secrets management** — All secrets via environment variables

## 🚢 Deployment

### Option 1: Vercel (Frontend) + Render/DigitalOcean (Backend)

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for detailed deploy instructions.

### Option 2: Single Docker Container

```bash
# Build and start everything
docker compose -f infra/docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f infra/docker-compose.prod.yml exec backend alembic upgrade head

# Seed data
docker compose -f infra/docker-compose.prod.yml exec backend python scripts/seed.py
```

### Environment Variables

See [.env.example](.env.example) for all required variables with documentation.

## 📊 Monitoring & Observability

- **Health check:** `GET /health` — database and Redis connectivity
- **Metrics:** `GET /metrics` — request counts, error rates, OTP metrics
- **Structured logging:** JSON format with request IDs
- **Sentry:** DSN placeholder in config — enable by setting `SENTRY_DSN`
- **Backup:** `scripts/backup.sh` — pg_dump with cron example

## 🗺️ Roadmap

### MVP (Current)
- [x] Map-based service discovery
- [x] Full-text and geospatial search
- [x] Business claim and admin verification flow
- [x] PWA offline support
- [x] Docker deployment

### Phase 2 (Planned)
- [ ] Image uploads (S3/MinIO)
- [ ] Event listings with date ranges
- [ ] Volunteer board with sign-ups
- [ ] Push notifications
- [ ] SMS notifications for claim status
- [ ] Advanced analytics dashboard

### Phase 3 (Future)
- [ ] Mobile app (React Native / Flutter)
- [ ] Multi-town support
- [ ] Government data integration
- [ ] Emergency alerts
- [ ] Accessibility audit (WCAG AA)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Branch Strategy

- `main` — Production-ready code (protected)
- `develop` — Integration branch
- `feature/*` — Feature branches

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
