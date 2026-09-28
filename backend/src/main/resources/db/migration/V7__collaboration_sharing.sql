ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS mode VARCHAR(16) NOT NULL DEFAULT 'VIEW_ONLY';

CREATE INDEX IF NOT EXISTS ix_schedule_members_user_role ON schedule_members(user_id, role);
CREATE INDEX IF NOT EXISTS ix_share_links_active ON share_links(schedule_id, revoked_at, expires_at);