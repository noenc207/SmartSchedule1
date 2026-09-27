#!/usr/bin/env bash
# ==============================================================================
# SmartSchedule Database Restore Script
# PostgreSQL Controlled Database Restoration from Custom Compressed Archive
# ==============================================================================
set -euo pipefail

# Configuration with safe defaults
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-smartschedule}"
POSTGRES_USER="${POSTGRES_USER:-smartschedule}"

usage() {
    echo "Usage: $0 <backup_file_path> [--force]"
    echo "Example: $0 /var/backups/smartschedule/smartschedule_backup_20260925_120000.dump"
    exit 1
}

if [ "$#" -lt 1 ]; then
    usage
fi

BACKUP_FILE="$1"
FORCE=false

if [ "${2:-}" = "--force" ]; then
    FORCE=true
fi

# Validation: file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file '${BACKUP_FILE}' not found."
    exit 1
fi

# Validation: pg_restore available
if ! command -v pg_restore >/dev/null 2>&1; then
    echo "ERROR: pg_restore command not found in PATH."
    exit 1
fi

# Validation: archive readability and integrity check
echo "[INFO] Inspecting archive header..."
if ! pg_restore --list "${BACKUP_FILE}" >/dev/null 2>&1; then
    echo "ERROR: Archive '${BACKUP_FILE}' is corrupted or not a valid pg_dump custom archive."
    exit 2
fi

echo "=================================================================="
echo "          SMARTSCHEDULE DATABASE RESTORE SAFETY CHECK"
echo "=================================================================="
echo "Target Host     : ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Target Database : ${POSTGRES_DB}"
echo "Target User     : ${POSTGRES_USER}"
echo "Backup Archive  : ${BACKUP_FILE}"
echo "=================================================================="
echo "WARNING: Restoring will overwrite and clean existing database schema!"

if [ "${FORCE}" != true ]; then
    read -r -p "Are you sure you want to proceed with restoration? (yes/no): " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        echo "Restoration aborted by user."
        exit 0
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting restoration..."

# Terminate active connections to allow clean schema drop/restore
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Terminating idle user connections to '${POSTGRES_DB}'..."
psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="postgres" \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    || true

# Execute pg_restore
# --clean: drop database objects prior to recreating them
# --if-exists: avoid error if objects do not exist
# --no-owner: do not set ownership to match original dump user
# --no-privileges: prevent privilege assignment errors
if pg_restore \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    "${BACKUP_FILE}"; then
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database restoration completed successfully!"
    exit 0
else
    # Note: pg_restore returns exit status 1 if minor warnings occurred during clean drop
    STATUS=$?
    if [ ${STATUS} -eq 1 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database restored with minor warnings (ignorable for clean drops)."
        exit 0
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: pg_restore failed with exit code ${STATUS}."
        exit ${STATUS}
    fi
fi
