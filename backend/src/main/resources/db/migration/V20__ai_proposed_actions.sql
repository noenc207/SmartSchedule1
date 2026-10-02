-- ==============================================================================
-- V20: SmartSchedule AI Proposed Actions & Audit Logging
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ai_actions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    tool VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, CONFIRMED, EXECUTING, SUCCESS, FAILED, CANCELLED
    summary VARCHAR(500) NOT NULL,
    parameters_json TEXT NOT NULL,
    has_conflict BOOLEAN NOT NULL DEFAULT FALSE,
    conflict_details TEXT,
    target_event_id UUID,
    result_details TEXT,
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_user_id
    ON ai_actions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_actions_conversation_id
    ON ai_actions(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_actions_status
    ON ai_actions(status);
