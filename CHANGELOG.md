# Changelog

All notable changes to TownPulse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Full-stack scaffold with React + FastAPI + PostgreSQL + PostGIS
- JWT authentication with phone OTP support
- Map-based discovery with Leaflet and OpenStreetMap
- Geospatial search using PostGIS ST_DWithin
- Full-text search using PostgreSQL tsvector
- Business claim flow with admin approval workflow
- PWA support with offline caching
- i18n support (English + Hindi)
- Docker Compose for local development
- GitHub Actions CI pipeline
- Seed script with 50 sample listings
- Admin dashboard for managing listings, claims, and analytics
- Business owner dashboard for managing claimed listings
- Rate limiting for OTP requests (max 5/hour per phone)
- Redis-backed caching for hot queries
- Structured JSON logging with request IDs
- Health check and metrics endpoints

## [0.1.0] - 2024-01-01

### Added
- Initial project scaffold
- Repository structure and documentation
- LICENSE (MIT)

---

## Release Process

1. Update `CHANGELOG.md` with all changes since last release
2. Bump version in `backend/app/core/config.py`
3. Create a PR from `develop` to `main`
4. Get PR approved and merge
5. Tag the release: `git tag -a v0.x.0 -m "Release v0.x.0"`
6. Push the tag: `git push origin v0.x.0`
7. GitHub Actions will automatically build and publish Docker images
8. Create a GitHub Release with the changelog entries

## Versioning

- **Major** (1.x.x) — Breaking API changes or major feature rework
- **Minor** (x.1.x) — New features, backward compatible
- **Patch** (x.x.1) — Bug fixes, minor improvements

[Unreleased]: https://github.com/R0HITHRAO/Townpulse/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/R0HITHRAO/Townpulse/releases/tag/v0.1.0
