# TownPulse Makefile
# ==================
# Usage: make <target>
#   make dev       - Start all services locally
#   make seed      - Seed the database
#   make test      - Run all tests
#   make lint      - Run all linters
#   make format    - Auto-format code
#   make build     - Build production Docker images
#   make deploy    - Deploy with docker compose (prod)
#   make down      - Stop all services
#   make clean     - Remove containers and volumes

.PHONY: dev seed test test-backend test-frontend lint lint-backend lint-frontend \
        format format-backend format-frontend build deploy down clean \
        migrate migrate-create health logs

# ─── Colors ──────────────────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RESET  := \033[0m

# ─── Default compose file ────────────────────────────────────────────────────
COMPOSE_FILE     := infra/docker-compose.yml
COMPOSE_PROD     := infra/docker-compose.prod.yml

# ─── Development ─────────────────────────────────────────────────────────────

## Start all development services (backend, frontend, postgres, redis)
dev:
	@echo "$(GREEN)Starting TownPulse development environment...$(RESET)"
	docker compose -f $(COMPOSE_FILE) up --build

## Start services in background
dev-bg:
	docker compose -f $(COMPOSE_FILE) up -d --build

## Stop all services
down:
	docker compose -f $(COMPOSE_FILE) down

## Stop and remove volumes
clean:
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f

# ─── Database ────────────────────────────────────────────────────────────────

## Run database migrations
migrate:
	docker compose -f $(COMPOSE_FILE) exec backend alembic upgrade head

## Rollback last migration
migrate-down:
	docker compose -f $(COMPOSE_FILE) exec backend alembic downgrade -1

## Create a new migration (usage: make migrate-create name="add_field")
migrate-create:
	docker compose -f $(COMPOSE_FILE) exec backend alembic revision --autogenerate -m "$(name)"

## Seed database with sample data
seed:
	@echo "$(GREEN)Seeding database with 50 sample listings...$(RESET)"
	docker compose -f $(COMPOSE_FILE) exec backend python scripts/seed.py

# ─── Testing ─────────────────────────────────────────────────────────────────

## Run all tests (backend + frontend)
test: test-backend test-frontend
	@echo "$(GREEN)All tests passed!$(RESET)"

## Run backend tests
test-backend:
	@echo "$(YELLOW)Running backend tests...$(RESET)"
	docker compose -f $(COMPOSE_FILE) exec backend pytest -v --tb=short

## Run frontend tests
test-frontend:
	@echo "$(YELLOW)Running frontend tests...$(RESET)"
	docker compose -f $(COMPOSE_FILE) exec frontend npm test -- --run

## Run tests with coverage
coverage:
	docker compose -f $(COMPOSE_FILE) exec backend pytest --cov=app --cov-report=html
	docker compose -f $(COMPOSE_FILE) exec frontend npm run test:coverage

# ─── Linting ─────────────────────────────────────────────────────────────────

## Run all linters
lint: lint-backend lint-frontend

## Lint backend Python code
lint-backend:
	@echo "$(YELLOW)Linting backend...$(RESET)"
	docker compose -f $(COMPOSE_FILE) exec backend ruff check app tests

## Lint frontend TypeScript code
lint-frontend:
	@echo "$(YELLOW)Linting frontend...$(RESET)"
	docker compose -f $(COMPOSE_FILE) exec frontend npm run lint

# ─── Formatting ──────────────────────────────────────────────────────────────

## Format all code
format: format-backend format-frontend

## Format backend Python code
format-backend:
	docker compose -f $(COMPOSE_FILE) exec backend black app tests
	docker compose -f $(COMPOSE_FILE) exec backend isort app tests

## Format frontend TypeScript code
format-frontend:
	docker compose -f $(COMPOSE_FILE) exec frontend npm run format

# ─── Production ──────────────────────────────────────────────────────────────

## Build production Docker images
build:
	@echo "$(GREEN)Building production images...$(RESET)"
	docker compose -f $(COMPOSE_PROD) build

## Deploy with production compose
deploy:
	@echo "$(GREEN)Deploying TownPulse...$(RESET)"
	docker compose -f $(COMPOSE_PROD) up -d --build
	docker compose -f $(COMPOSE_PROD) exec backend alembic upgrade head
	@echo "$(GREEN)TownPulse deployed! Visit http://localhost$(RESET)"

## Stop production services
deploy-down:
	docker compose -f $(COMPOSE_PROD) down

# ─── Utilities ───────────────────────────────────────────────────────────────

## Check health of running services
health:
	@curl -s http://localhost:8000/health | python -m json.tool || echo "Backend not running"

## View logs for all services
logs:
	docker compose -f $(COMPOSE_FILE) logs -f

## View backend logs only
logs-backend:
	docker compose -f $(COMPOSE_FILE) logs -f backend

## View frontend logs only
logs-frontend:
	docker compose -f $(COMPOSE_FILE) logs -f frontend

## Open backend shell
shell-backend:
	docker compose -f $(COMPOSE_FILE) exec backend bash

## Open postgres shell
shell-db:
	docker compose -f $(COMPOSE_FILE) exec postgres psql -U townpulse -d townpulse

## Backup the database
backup:
	docker compose -f $(COMPOSE_FILE) exec postgres \
		pg_dump -U townpulse townpulse > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created!$(RESET)"

## Show help
help:
	@echo "$(GREEN)TownPulse — Available Make Targets$(RESET)"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  /'
