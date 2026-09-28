CREATE TABLE event_occurrence_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    occurrence_start TIMESTAMPTZ NOT NULL,
    action VARCHAR(16) NOT NULL,
    override_start TIMESTAMPTZ,
    override_end TIMESTAMPTZ,
    override_title VARCHAR(200),
    override_location VARCHAR(255),
    override_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, occurrence_start),
    CONSTRAINT ck_occurrence_exception_action CHECK (action IN ('MODIFIED', 'CANCELLED'))
);

CREATE INDEX ix_occurrence_exceptions_event_start
    ON event_occurrence_exceptions(event_id, occurrence_start);
