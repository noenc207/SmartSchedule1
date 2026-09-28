ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS related_entity_id UUID,
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_idempotency_key
    ON notifications(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_notifications_user_created
    ON notifications(user_id, created_at DESC);
