ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ix_schedules_owner_updated
    ON schedules(owner_id, updated_at DESC);
