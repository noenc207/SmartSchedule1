# SmartSchedule Production Operations Runbook

## 1. Pre-Flight Checklist

Before deploying SmartSchedule to production, verify each item:

- [x] **Flyway Migrations**: All 15 migrations (`V1` through `V15`) present in `backend/src/main/resources/db/migration/`.
- [x] **Foreign Key Indexing**: `V15__production_indexing_and_concurrency.sql` verified to prevent table-level share locks.
- [x] **Optimistic Locking**: `Schedule.java` entity has `@Version` and `ScheduleService` validates version matching.
- [x] **Pessimistic Invariant Locking**: `TaskRepository.findByIdWithLock` guards task remaining duration calculations.
- [x] **Connection Pool Configuration**: HikariCP maximum pool size, min idle, and timeouts configured via environment variables.
- [x] **Production Secrets**: Generated 64-character random string for `SMARTSCHEDULE_JWT_SECRET`.
- [x] **CORS Origins**: Restricted `SMARTSCHEDULE_CORS_ALLOWED_ORIGINS` to trusted domains.
- [x] **Automated Backups**: Configured daily snapshot cron job using `scripts/db_backup.sh` or `scripts/db_backup.ps1`.
- [x] **Disaster Recovery Tested**: Restoration verified using test database.

---

## 2. Production Environment Configuration (`.env.prod`)

Create `.env.prod` in the project root:

```ini
# PostgreSQL Configuration
POSTGRES_DB=smartschedule
POSTGRES_USER=smartschedule_admin
POSTGRES_PASSWORD=<SECURE_STRONG_PASSWORD_HERE>

# Spring Boot Data Source & HikariCP
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/smartschedule
SPRING_DATASOURCE_USERNAME=smartschedule_admin
SPRING_DATASOURCE_PASSWORD=<SECURE_STRONG_PASSWORD_HERE>

# HikariCP Pool Sizing (Tuned for 4-core production node)
DB_POOL_MAX_SIZE=25
DB_POOL_MIN_IDLE=5
DB_CONNECTION_TIMEOUT=20000
DB_IDLE_TIMEOUT=300000
DB_MAX_LIFETIME=1200000

# Security & Tokens
SMARTSCHEDULE_JWT_SECRET=<MINIMUM_32_CHAR_CRYPTOGRAPHIC_SECRET_KEY>
SMARTSCHEDULE_SECURE_COOKIE=true
SMARTSCHEDULE_CORS_ALLOWED_ORIGINS=https://smartschedule.yourdomain.com

# Deployment Modes & Registration Gate
SMARTSCHEDULE_PLAN_MODE=ALL_PRO
SMARTSCHEDULE_REGISTRATION_KEY=<CUSTOM_ACTIVATION_KEY_2026>

# Abuse Protection & Rate Limiting
SMARTSCHEDULE_RATE_LIMIT_ENABLED=true
SMARTSCHEDULE_RATE_LIMIT_REGISTER_PER_MIN=5
SMARTSCHEDULE_RATE_LIMIT_LOGIN_PER_MIN=15
SMARTSCHEDULE_RATE_LIMIT_REFRESH_PER_MIN=30

# Frontend Variables
VITE_API_BASE_URL=/api/v1
VITE_API_MODE=real
```

---

## 3. Deployment Procedure

### 3.1 Launching the Stack
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### 3.2 Verifying Service Health
Check running container states:
```bash
docker compose -f docker-compose.prod.yml ps
```
Expected output:
```text
NAME                     IMAGE                  COMMAND                  SERVICE      STATUS
smartschedule-api-prod   smartschedule-api      "java -jar app.jar"      backend      running (healthy)
smartschedule-db-prod    postgres:16-alpine     "docker-entrypoint.s…"   postgres     running (healthy)
smartschedule-web-prod   smartschedule-web      "/docker-entrypoint.…"   frontend     running
```

Verify backend healthcheck endpoint:
```bash
curl -i http://localhost:8080/api/v1/health
```
Expected HTTP 200 response:
```json
{
  "status": "UP",
  "planMode": "ALL_PRO",
  "registrationKeyRequired": true,
  "rateLimiting": true
}
```

### 3.3 Verifying Database Health
Run the diagnostic report:
```bash
php tools/db_health_report.php
```
Ensure:
- Buffer Cache Hit Rate is $\ge 98.0\%$.
- Connection pool utilization is healthy ($< 70\%$).
- 0 blocked transactions detected.

---

## 4. Troubleshooting Playbook

### Incident 1: Connection Pool Exhaustion (`ConnectionTimeoutException`)
**Symptom**: Logs show `HikariPool-1 - Connection is not available, request timed out after 20000ms`.
**Root Causes**:
1. Long-running query holding connection open.
2. Sudden burst of concurrent traffic exceeding `DB_POOL_MAX_SIZE`.
**Immediate Remediation**:
1. Run `php tools/db_health_report.php` to inspect active connections and queries.
2. Terminate long-running idle transactions:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle in transaction' 
     AND state_change < current_timestamp - INTERVAL '2 minutes';
   ```
3. If valid high traffic, increase `DB_POOL_MAX_SIZE` (e.g. from 25 to 40) in `.env.prod` and reload:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps backend
   ```

### Incident 2: Database Row Lock / Deadlock (`blocked_locks`)
**Symptom**: Requests hang and time out when creating events or editing schedules.
**Diagnostics**:
Run:
```bash
php tools/db_health_report.php
```
Inspect the `LOCK CONTENTION & BLOCKED QUERIES` section for blocked PIDs.
**Remediation**:
Terminate the blocking backend PID:
```sql
SELECT pg_cancel_backend(<blocking_pid>);
```

### Incident 3: Frequent HTTP 409 Conflicts (`RESOURCE_VERSION_CONFLICT`)
**Symptom**: Users see frequent "Schedule was modified by another transaction" errors.
**Cause**: Multiple automated integrations or users concurrently modifying the same schedule.
**Remediation**:
This is expected optimistic locking behavior protecting data integrity. The frontend re-fetches the schedule on conflict and prompts the user to refresh. If caused by automated calendar sync loops, verify external sync polling interval is $\ge 5$ minutes.

---

## 5. Rollback Procedures

### 5.1 Application Code Rollback
If a newly deployed backend container introduces bugs:
```bash
# 1. Check previous git tag or commit
git checkout <previous_stable_tag>

# 2. Rebuild and restart services
docker compose -f docker-compose.prod.yml up -d --build backend frontend
```

### 5.2 Emergency Database Rollback from Snapshot
If data corruption or catastrophic schema failure occurs:
```bash
# 1. Stop backend to halt incoming writes
docker compose -f docker-compose.prod.yml stop backend

# 2. Run restore script pointing to last known good snapshot
./scripts/db_restore.sh /var/backups/smartschedule/smartschedule_backup_YYYYMMDD_HHMMSS.dump --force

# 3. Restart backend
docker compose -f docker-compose.prod.yml start backend
```
