# SmartSchedule Database Backup & Disaster Recovery Runbook

## 1. Overview & Strategy

SmartSchedule employs a **two-tier backup strategy**:
1. **Logical Backups (`pg_dump -Fc`)**:
   Full, schema-consistent snapshots taken daily. Uses PostgreSQL custom compressed format (`.dump`), supporting selective restoration, object reordering, and parallel decompression.
2. **Point-in-Time Recovery (PITR / WAL Archiving)**:
   Recommended for enterprise production clusters by archiving write-ahead logs (`archive_command` in `postgresql.conf`).

All scripts included in the repository adhere to the **Principle of Least Privilege**, log actions with millisecond precision, and prune aged snapshots according to a configurable retention policy (default: 7 days).

---

## 2. Backup Execution

### 2.1 Automated Script on Linux / Docker (`scripts/db_backup.sh`)

#### Standard Linux Host:
```bash
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_DB="smartschedule"
export POSTGRES_USER="smartschedule"
export PGPASSWORD="your_secure_password"
export BACKUP_DIR="/var/backups/smartschedule"
export RETENTION_DAYS="7"

chmod +x scripts/db_backup.sh
./scripts/db_backup.sh
```

#### Inside Docker Deployment:
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  /bin/sh -c "pg_dump -U smartschedule -d smartschedule -Fc -f /var/backups/smartschedule/backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.2 Automated Script on Windows PowerShell (`scripts/db_backup.ps1`)
```powershell
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:POSTGRES_DB = "smartschedule"
$env:POSTGRES_USER = "smartschedule"
$env:PGPASSWORD = "your_secure_password"
$env:BACKUP_DIR = "D:\SmartSchedul\backups"

.\scripts\db_backup.ps1 -RetentionDays 7
```

---

## 3. Database Restoration

> [!WARNING]
> Restoring a database using `--clean` drops existing tables and recreates them from the backup snapshot. Always perform restoration during an authorized maintenance window.

### 3.1 Linux / Docker Restoration (`scripts/db_restore.sh`)

#### Interactive Mode (Requires User Confirmation):
```bash
chmod +x scripts/db_restore.sh
./scripts/db_restore.sh /var/backups/smartschedule/smartschedule_backup_20260925_120000.dump
```

#### Unattended / Automated Recovery:
```bash
./scripts/db_restore.sh /var/backups/smartschedule/smartschedule_backup_20260925_120000.dump --force
```

### 3.2 Windows PowerShell Restoration (`scripts/db_restore.ps1`)
```powershell
.\scripts\db_restore.ps1 -BackupFile "D:\SmartSchedul\backups\smartschedule_backup_20260925_120000.dump"
```

### 3.3 Manual Direct Restoration via `pg_restore`
```bash
pg_restore \
  --host=localhost \
  --port=5432 \
  --username=smartschedule \
  --dbname=smartschedule \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  /path/to/backup.dump
```

---

## 4. Automation Scheduling

### 4.1 Linux Cron Job (Daily at 02:00 UTC)
Open crontab:
```bash
crontab -e
```
Add entry:
```cron
0 2 * * * /opt/smartschedule/scripts/db_backup.sh >> /var/log/smartschedule_backup_cron.log 2>&1
```

### 4.2 Windows Task Scheduler
Create a scheduled task via PowerShell:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File D:\SmartSchedul\scripts\db_backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00 AM"
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "SmartSchedule_Daily_Backup" -Description "Daily PostgreSQL backup for SmartSchedule" -User "SYSTEM"
```

---

## 5. Verification & Disaster Recovery Drill

### 5.1 Archive Integrity Check
Verify archive table of contents without restoring data:
```bash
pg_restore --list /path/to/backup.dump | head -n 30
```

### 5.2 Verification in an Isolated Test Database
Always test restoration against a staging database before certifying a disaster recovery procedure:
```bash
# 1. Create temporary verification database
psql -U postgres -c "CREATE DATABASE smartschedule_recovery_test;"

# 2. Restore into test database
pg_restore -U smartschedule -d smartschedule_recovery_test --no-owner /path/to/backup.dump

# 3. Verify record counts match
psql -U smartschedule -d smartschedule_recovery_test -c "
  SELECT 'users' as tbl, count(*) from users
  UNION ALL
  SELECT 'schedules', count(*) from schedules
  UNION ALL
  SELECT 'events', count(*) from events
  UNION ALL
  SELECT 'tasks', count(*) from tasks;
"

# 4. Clean up test database
psql -U postgres -c "DROP DATABASE smartschedule_recovery_test;"
```

---

## 6. Security & Encryption Standards

1. **Storage Encryption**: Backup archives stored on disk or transferred to cloud buckets (e.g. AWS S3, Google Cloud Storage) must be encrypted at rest using AES-256 (`gpg` or SSE-KMS).
2. **Secret Masking**: Scripts use `PGPASSWORD` environment variables and NEVER pass raw passwords as command-line arguments to avoid exposure in `ps aux` process listings.
3. **Restricted File Permissions**: Backup directories and output files are created with mode `700` (directory) and `600` (dump file) so only the system administrator or service user can read them.
