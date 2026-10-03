-- ==============================================================================
-- V21: SmartSchedule AI Agent Plans, Risk Engine & Audit Logging
-- ==============================================================================

ALTER TABLE ai_actions ADD COLUMN IF NOT EXISTS risk_level VARCHAR(32) NOT NULL DEFAULT 'IMPORTANT_WRITE';
ALTER TABLE ai_actions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE ai_actions ADD COLUMN IF NOT EXISTS step_order INT DEFAULT 1;

CREATE TABLE IF NOT EXISTS ai_action_plans (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, CONFIRMED, EXECUTING, SUCCESS, FAILED, CANCELLED
    action_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ai_action_plans_user ON ai_action_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_plan_id ON ai_actions(plan_id);
