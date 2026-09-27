# SmartSchedule — Demo & Test Account Cleanup Runbook

## 1. Overview & Purpose

Before opening the temporary production deployment to real users, any pre-existing demo, mock, or QA test accounts in the PostgreSQL database must be audited and safely removed.

This runbook outlines the required backup, audit, execution, and verification steps.

---

## 2. Mandatory Pre-Cleanup Database Backup

Always take a full, verifiable database dump before running any data deletion script:

```bash
# Using pg_dump directly
pg_dump -h localhost -p 5432 -U smartschedule -d smartschedule -F c -b -v -f smartschedule_backup_pre_cleanup.dump

# Or using docker compose
docker compose exec -t postgres pg_dump -U smartschedule -d smartschedule -F c -b -v > smartschedule_backup_pre_cleanup.dump
```

To verify the backup file was created and is non-empty:
```bash
ls -lh smartschedule_backup_pre_cleanup.dump
```

---

## 3. Pre-Cleanup Audit Query

Run this query to inspect existing accounts and identify targets for removal:

```sql
SELECT 
    id, 
    email, 
    display_name, 
    tier, 
    created_at
FROM users
ORDER BY created_at ASC;
```

Target demo/test email patterns identified:
- `alex.nguyen@fpt.edu.vn` (original offline demo student)
- `student@fpt.edu.vn`
- `nhi.vn@fpt.edu.vn` (mock testing profile)
- `test@smartschedule.local`
- Accounts matching `%@example.com`
- Accounts matching `demo_%@%`, `test_%@%`, or `mock_%@%`

---

## 4. Execution of the Cleanup Script

The script `backend/src/main/resources/db/cleanup_demo_users.sql` handles safe, ordered cascading deletion inside a single ACID transaction (`BEGIN; ... COMMIT;`).

### Step 4.1: Dry-Run Mode (Test without committing)
Open `cleanup_demo_users.sql`, change the final line from `COMMIT;` to `ROLLBACK;`, then execute:

```bash
psql -h localhost -U smartschedule -d smartschedule -f backend/src/main/resources/db/cleanup_demo_users.sql
```

Review the printed notices:
```text
NOTICE:  Target demo/test accounts to remove: 3
NOTICE:  Demo user cleanup completed. Remaining active users: 0
ROLLBACK
```

### Step 4.2: Permanent Execution
Ensure the last line is `COMMIT;` and execute:

```bash
psql -h localhost -U smartschedule -d smartschedule -f backend/src/main/resources/db/cleanup_demo_users.sql
```

Or via Docker Compose:
```bash
docker compose exec -T postgres psql -U smartschedule -d smartschedule < backend/src/main/resources/db/cleanup_demo_users.sql
```

---

## 5. Cascading Order Followed by the Script

To avoid foreign key constraint violations, the script deletes rows in strict topological dependency order:

1. `refresh_tokens` (referencing users)
2. `mobility_acknowledgements` (referencing users)
3. `user_locations` (referencing users)
4. `notifications` (referencing users)
5. `availabilities` (referencing users and schedules)
6. `schedule_members` & `share_links` (referencing users and schedules)
7. `scheduling_preferences` (referencing schedules)
8. `event_occurrence_exceptions` (referencing events)
9. `events` (referencing schedules and users)
10. `tasks` (referencing schedules and users)
11. `categories` (referencing users)
12. `schedules` (referencing users)
13. `activity_logs` (if table exists)
14. `users`

---

## 6. Post-Cleanup Verification

Verify that all demo accounts are gone and remaining accounts are intact:

```sql
SELECT count(*) AS remaining_users FROM users;
SELECT count(*) AS remaining_schedules FROM schedules;
SELECT count(*) AS remaining_events FROM events;
SELECT count(*) AS remaining_tasks FROM tasks;
```

If `remaining_users` shows only legitimate users (or 0 for a clean fresh slate), the database is ready for deployment.
