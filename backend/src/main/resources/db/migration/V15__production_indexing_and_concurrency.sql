-- ==============================================================================
-- V15: Production Indexing, Foreign Key Lock Prevention & Concurrency Optimizations
-- ==============================================================================
-- PURPOSE:
--   1. Add missing foreign key indexes to prevent table-level share locks during
--      concurrent child/parent cascades and deletions.
--   2. Add composite indexes for high-throughput multi-user calendar and task queries.
--   3. Optimize notification and reminder queue lookups under concurrent load.
-- ==============================================================================

-- 1. Foreign Key Indexes for Non-blocking Concurrent Deletes/Updates
CREATE INDEX IF NOT EXISTS ix_events_category
    ON events(category_id)
    WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_category
    ON tasks(category_id)
    WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_activity_logs_schedule
    ON activity_logs(schedule_id)
    WHERE schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_activity_logs_actor
    ON activity_logs(actor_id)
    WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_replaced_by
    ON refresh_tokens(replaced_by)
    WHERE replaced_by IS NOT NULL;

-- 2. Concurrency & High-Throughput Composite Query Indexes

-- Fast task remaining duration recalculation: filter non-cancelled events for a source task
CREATE INDEX IF NOT EXISTS ix_events_source_task_status
    ON events(source_task_id, status)
    WHERE source_task_id IS NOT NULL;

-- Accelerated ReminderJob polling: only scan events that have reminders configured
CREATE INDEX IF NOT EXISTS ix_events_reminders
    ON events(reminder_minutes, status)
    WHERE reminder_minutes IS NOT NULL;

-- High-frequency task filtering by schedule and status (TODO / IN_PROGRESS / DONE)
CREATE INDEX IF NOT EXISTS ix_tasks_schedule_status
    ON tasks(schedule_id, status);

-- High-frequency task filtering by schedule and category
CREATE INDEX IF NOT EXISTS ix_tasks_schedule_category
    ON tasks(schedule_id, category_id)
    WHERE category_id IS NOT NULL;

-- Fast multi-user collaboration membership lookup ordered by recent joins
CREATE INDEX IF NOT EXISTS ix_schedule_members_user_created
    ON schedule_members(user_id, created_at DESC);

-- Fast user custom location list ordered alphabetically by name
CREATE INDEX IF NOT EXISTS ix_user_locations_user_name
    ON user_locations(user_id, name);

-- Fast schedule optimistic concurrency version checking
CREATE INDEX IF NOT EXISTS ix_schedules_id_owner_version
    ON schedules(id, owner_id, version);

-- Notification scheduler polling index
CREATE INDEX IF NOT EXISTS ix_notifications_scheduled_due
    ON notifications(user_id, scheduled_for)
    WHERE scheduled_for IS NOT NULL;
