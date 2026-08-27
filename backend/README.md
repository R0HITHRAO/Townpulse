# TownPulse — Backend

FastAPI backend for TownPulse with PostgreSQL + PostGIS, Redis, JWT auth, and more.

## Prerequisites

- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 15 with PostGIS extension
- Redis 7

## Local Development

### With Docker (recommended)

```bash
# From the root directory
make dev

# Or from the backend directory
docker compose up --build
```

### Without Docker

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure env vars
cp .env.example .env

# Make sure PostgreSQL with PostGIS is running
# Enable PostGIS extension:
# psql -U postgres -c "CREATE DATABASE townpulse;"
# psql -U postgres -d townpulse -c "CREATE EXTENSION postgis;"

# Run migrations
alembic upgrade head

# Seed data
python scripts/seed.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

## Running Tests

```bash
# With Docker
make test-backend

# Without Docker (with venv activated)
pytest -v
pytest -v --cov=app --cov-report=html  # With coverage
```

## Directory Structure

```
backend/
├── app/
│   ├── api/                 # FastAPI routers
│   │   ├── auth.py          # Auth endpoints (register, login, OTP)
│   │   ├── listings.py      # Listing CRUD and search
│   │   ├── admin.py         # Admin management endpoints
│   │   └── health.py        # Health check and metrics
│   ├── core/                # Core utilities
│   │   ├── config.py        # Pydantic Settings
│   │   ├── security.py      # JWT, password hashing, OTP
│   │   ├── database.py      # SQLAlchemy engine and session
│   │   ├── dependencies.py  # FastAPI dependency injection
│   │   ├── logging.py       # Structured JSON logging
│   │   └── rate_limiter.py  # Redis-backed rate limiting
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business logic layer
│   ├── tasks/               # Celery background tasks
│   └── main.py              # FastAPI app factory
├── alembic/                 # Database migrations
│   └── versions/            # Migration files
├── tests/                   # Pytest test suite
├── scripts/                 # Utility scripts
│   ├── seed.py              # Database seeder
│   └── backup.sh            # PostgreSQL backup
├── seed/
│   └── seed_data.json       # 50 sample listings
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Local dev compose
├── requirements.txt
└── .env.example
```

## Database Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "add_field_to_listings"

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## Environment Variables

See [.env.example](.env.example) for all required variables.

## Deployment

### DigitalOcean App Platform

1. Connect your GitHub repository
2. Set the build command: `pip install -r requirements.txt`
3. Set the run command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Add a managed PostgreSQL database with the PostGIS extension enabled
5. Add a managed Redis database
6. Set all environment variables from `.env.example`

### Render

1. Create a new Web Service from your GitHub repo
2. Set root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add PostgreSQL and Redis services
6. Set environment variables

### Docker (single container)

```bash
docker build -t townpulse-backend .
docker run -p 8000:8000 --env-file .env townpulse-backend
```

## Security Considerations

- All secrets via environment variables (never hardcoded)
- JWT: short-lived access tokens (30 min) + refresh tokens (7 days)
- OTP: 10-minute expiry, max 5 requests per phone per hour
- Rate limiting on all public endpoints via Redis
- CORS restricted to allowed origins
- Input validation via Pydantic on all endpoints
- bcrypt password hashing
