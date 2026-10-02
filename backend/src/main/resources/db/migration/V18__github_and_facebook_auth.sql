-- ==============================================================================
-- V18: GitHub & Facebook Social Login Integration
-- ==============================================================================

-- 1. Extend Users table to support GitHub and Facebook identities
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_github_id
    ON users (github_id)
    WHERE github_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_facebook_id
    ON users (facebook_id)
    WHERE facebook_id IS NOT NULL;

-- 2. Seed active registration keys and reset SMART-DEPLOY-2026
UPDATE registration_keys
SET status = 'ACTIVE', used_at = NULL, used_by = NULL
WHERE key_hash = encode(digest('SMART-DEPLOY-2026', 'sha256'), 'hex');

INSERT INTO registration_keys (key_hash, status, created_at)
VALUES (encode(digest('GITHUB-DEV-2026', 'sha256'), 'hex'), 'ACTIVE', now())
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO registration_keys (key_hash, status, created_at)
VALUES (encode(digest('FACEBOOK-DEV-2026', 'sha256'), 'hex'), 'ACTIVE', now())
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO registration_keys (key_hash, status, created_at)
VALUES (encode(digest('SMART-VIP-2026', 'sha256'), 'hex'), 'ACTIVE', now())
ON CONFLICT (key_hash) DO NOTHING;
