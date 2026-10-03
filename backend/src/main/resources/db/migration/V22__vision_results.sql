-- ==============================================================================
-- V22: SmartSchedule Vision Microservice Results & Audit Logging
-- ==============================================================================

CREATE TABLE IF NOT EXISTS vision_results (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    summary TEXT NOT NULL,
    raw_text TEXT,
    payload_json TEXT NOT NULL,
    warnings_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vision_results_user ON vision_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vision_results_conv ON vision_results(conversation_id);
