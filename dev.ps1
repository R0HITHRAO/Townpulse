# ==============================================================================
# TownPulse PowerShell Helper Script for Windows
# ==============================================================================
# Usage:
#   .\dev.ps1             - Start all full-stack services with Docker Compose
#   .\dev.ps1 seed        - Seed database with 50 listings + admin user
#   .\dev.ps1 test        - Run backend and frontend tests
#   .\dev.ps1 down        - Stop all running containers
#   .\dev.ps1 logs        - View container logs
# ==============================================================================

param (
    [string]$Action = "dev"
)

$ComposeFile = "infra/docker-compose.yml"

switch ($Action.ToLower()) {
    "dev" {
        Write-Host "🚀 Starting TownPulse full-stack environment..." -ForegroundColor Green
        docker compose -f $ComposeFile up --build
    }
    "dev-bg" {
        Write-Host "🚀 Starting TownPulse in background..." -ForegroundColor Green
        docker compose -f $ComposeFile up -d --build
    }
    "seed" {
        Write-Host "🌱 Seeding database with sample town listings..." -ForegroundColor Green
        docker compose -f $ComposeFile exec backend python scripts/seed.py
    }
    "test" {
        Write-Host "🧪 Running tests..." -ForegroundColor Yellow
        docker compose -f $ComposeFile exec backend pytest -v
        cd frontend
        npm test
        cd ..
    }
    "down" {
        Write-Host "🛑 Stopping TownPulse containers..." -ForegroundColor Red
        docker compose -f $ComposeFile down
    }
    "logs" {
        docker compose -f $ComposeFile logs -f
    }
    Default {
        Write-Host "Usage: .\dev.ps1 [dev | seed | test | down | logs]" -ForegroundColor Cyan
    }
}
