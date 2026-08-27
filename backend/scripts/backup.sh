#!/bin/bash
# ==============================================================================
# TownPulse Database Backup Script
# ==============================================================================
# Performs automated PostgreSQL pg_dump backups with retention cleanup.
#
# Cron setup example (run daily at 2:00 AM):
#   0 2 * * * /path/to/backend/scripts/backup.sh >> /var/log/townpulse_backup.log 2>&1
# ==============================================================================

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/townpulse}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/townpulse_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Database connection variables (defaults to local environment)
DB_HOST="${POSTGRES_SERVER:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-townpulse}"
DB_NAME="${POSTGRES_DB:-townpulse}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting TownPulse PostgreSQL backup..."

# Execute pg_dump and compress with gzip
PGPASSWORD="${POSTGRES_PASSWORD:-townpulse_dev_password}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -F c \
    -b \
    -v \
    -f "${BACKUP_DIR}/townpulse_${TIMESTAMP}.dump" \
    "${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup successfully created at: ${BACKUP_DIR}/townpulse_${TIMESTAMP}.dump"

# Cleanup backups older than retention policy
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "townpulse_*.dump" -mtime +"${RETENTION_DAYS}" -exec rm {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process complete."
