# ==============================================================================
# TownPulse PowerShell Helper Script for Windows
# ==============================================================================

param (
    [string]$Action = "dev"
)

# Resolve path relative to this script directory
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    $ProjectRoot = Get-Location
}

$ComposeFile = Join-Path $ProjectRoot "infra/docker-compose.yml"

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
        Set-Location (Join-Path $ProjectRoot "frontend")
        npm test
        Set-Location $ProjectRoot
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
