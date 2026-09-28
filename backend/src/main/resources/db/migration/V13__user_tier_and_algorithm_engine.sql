-- V13: User Tier (FREE / PRO) for Advanced Algorithm Engine gating
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(16) NOT NULL DEFAULT 'FREE';
CREATE INDEX IF NOT EXISTS ix_users_tier ON users(tier);
