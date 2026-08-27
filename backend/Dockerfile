# ==============================================================================
# TownPulse Backend — Production Multi-Stage Dockerfile
# ==============================================================================

# ─── Stage 1: Build & Dependencies ───────────────────────────────────────────
FROM python:3.11-slim as builder

WORKDIR /build

# Install system compilation packages for PostgreSQL/PostGIS client libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --user -r requirements.txt

# ─── Stage 2: Production Runtime ──────────────────────────────────────────────
FROM python:3.11-slim as runner

WORKDIR /app

# Install runtime PostgreSQL & PostGIS C-libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgeos-c1v5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy application source code
COPY . .

# Expose API port
EXPOSE 8000

# Docker healthcheck against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production run command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
