-- ==============================================================================
-- V17: Registration Keys and Google Quick Sign-Up Integration
-- ==============================================================================

-- 1. Extend Users table to support Google OAuth identity
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_id
    ON users (google_id)
    WHERE google_id IS NOT NULL;

-- 2. Registration Keys table for secure, single-use, server-validated keys
CREATE TABLE IF NOT EXISTS registration_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES users(id),
    CONSTRAINT ck_registration_key_status CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS ix_registration_keys_status ON registration_keys(status);
CREATE INDEX IF NOT EXISTS ix_registration_keys_hash ON registration_keys(key_hash);

-- 3. Seed initial active registration keys for production & onboarding
INSERT INTO registration_keys (key_hash, status, created_at)
VALUES (encode(digest('SMART-GOOGLE-KEY-2026', 'sha256'), 'hex'), 'ACTIVE', now())
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO registration_keys (key_hash, status, created_at)
VALUES (encode(digest('GOOGLE-PRO-2026', 'sha256'), 'hex'), 'ACTIVE', now())
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO registration_keys (key_hash, status, created_at)
VALUES (encode(digest('SMART-DEPLOY-2026', 'sha256'), 'hex'), 'ACTIVE', now())
ON CONFLICT (key_hash) DO NOTHING;
