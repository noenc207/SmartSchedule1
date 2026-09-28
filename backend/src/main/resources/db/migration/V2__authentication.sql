ALTER TABLE users
    ADD COLUMN avatar_url VARCHAR(500),
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent VARCHAR(512),
    ip_address INET
);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX ix_refresh_tokens_active ON refresh_tokens(token_hash, revoked_at, expires_at);
