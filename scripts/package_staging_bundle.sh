#!/usr/bin/env bash
# ==============================================================================
# SmartSchedule — Staging Artifact Packager (Bash / Linux / macOS)
# Packages only deployment-safe files into staging-transfer-bundle.tar.gz
# Excludes development secrets, .env files, node_modules, target, dumps, reports
# ==============================================================================
set -euo pipefail

OUTPUT_FILE="${1:-staging-transfer-bundle.tar.gz}"

echo "[INFO] Creating deployment-safe staging archive: ${OUTPUT_FILE}..."

tar --exclude='.env*' \
    --exclude='*.dump' \
    --exclude='*.log' \
    --exclude='node_modules' \
    --exclude='target' \
    --exclude='frontend/dist' \
    --exclude='playwright-report' \
    --exclude='test-results' \
    --exclude='.git*' \
    -czvf "${OUTPUT_FILE}" \
    backend \
    frontend \
    deployment \
    scripts \
    load-tests \
    docs \
    docker-compose.prod.yml \
    docker-compose.yml

echo "[INFO] Staging bundle created successfully: ${OUTPUT_FILE}"
echo "[INFO] Transfer to remote Linux staging host:"
echo "       scp ${OUTPUT_FILE} user@staging-host:~/"
