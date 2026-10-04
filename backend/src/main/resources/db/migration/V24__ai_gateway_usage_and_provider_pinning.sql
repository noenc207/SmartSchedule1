-- ==============================================================================
-- V24: AI Gateway Usage Quota (20/day) and Conversation Provider Pinning
-- ==============================================================================

-- 1. Add conversation pinning fields
ALTER TABLE ai_conversations
    ADD COLUMN IF NOT EXISTS pinned_provider VARCHAR(64) DEFAULT 'wayjet',
    ADD COLUMN IF NOT EXISTS pinned_model VARCHAR(128);

-- 2. Daily User AI Usage Quota Tracking (Shared across all providers)
CREATE TABLE IF NOT EXISTS ai_user_daily_usage (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    last_request_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_user_daily_usage UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_user_daily_usage_lookup
    ON ai_user_daily_usage(user_id, usage_date);

-- 3. Provider Telemetry & Cost / Fallback Observability
CREATE TABLE IF NOT EXISTS ai_provider_telemetry (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    request_id VARCHAR(64),
    client_message_id VARCHAR(64),
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    latency_ms BIGINT NOT NULL,
    tokens_used INTEGER,
    status VARCHAR(32) NOT NULL, -- 'SUCCESS', 'FALLBACK', 'FAILED'
    fallback_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_telemetry_created_at
    ON ai_provider_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_provider_telemetry_user_id
    ON ai_provider_telemetry(user_id, created_at DESC);
