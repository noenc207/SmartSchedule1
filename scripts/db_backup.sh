#!/usr/bin/env bash
# ==============================================================================
# SmartSchedule Database Backup Script
# PostgreSQL Automated Logical Backup with Custom Compressed Format & Retention
# ==============================================================================
set -euo pipefail

# Configuration with safe defaults
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-smartschedule}"
POSTGRES_USER="${POSTGRES_USER:-smartschedule}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/smartschedule}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Timestamp for unique file naming
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_backup_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting SmartSchedule PostgreSQL backup..." | tee -a "${LOG_FILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Target Database: ${POSTGRES_DB} on ${POSTGRES_HOST}:${POSTGRES_PORT}" | tee -a "${LOG_FILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Output File: ${BACKUP_FILE}" | tee -a "${LOG_FILE}"

# Verify pg_dump binary is available
if ! command -v pg_dump >/dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: pg_dump command not found in PATH." | tee -a "${LOG_FILE}"
    exit 1
fi

# Execute pg_dump using PostgreSQL custom format (-Fc)
# -Fc includes database objects, schema, and compressed data, supporting selective parallel restore
if pg_dump \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --format=c \
    --blobs \
    --verbose \
    --file="${BACKUP_FILE}" >> "${LOG_FILE}" 2>&1; then
    
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup successfully completed! File size: ${BACKUP_SIZE}" | tee -a "${LOG_FILE}"
    chmod 600 "${BACKUP_FILE}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: pg_dump failed. Check log: ${LOG_FILE}" | tee -a "${LOG_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 2
fi

# Apply retention policy: delete backups older than RETENTION_DAYS
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruning backups older than ${RETENTION_DAYS} days..." | tee -a "${LOG_FILE}"
find "${BACKUP_DIR}" -name "${POSTGRES_DB}_backup_*.dump" -type f -mtime +"${RETENTION_DAYS}" -exec rm -v {} \; >> "${LOG_FILE}" 2>&1 || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup operation finished successfully." | tee -a "${LOG_FILE}"
exit 0
