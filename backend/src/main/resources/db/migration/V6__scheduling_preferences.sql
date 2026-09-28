CREATE TABLE scheduling_preferences (
    id UUID PRIMARY KEY,
    schedule_id UUID NOT NULL UNIQUE REFERENCES schedules(id) ON DELETE CASCADE,
    max_daily_minutes INTEGER NOT NULL DEFAULT 480,
    min_break_minutes INTEGER NOT NULL DEFAULT 30,
    preferred_start TIME,
    preferred_end TIME,
    maximum_session_minutes INTEGER NOT NULL DEFAULT 120,
    minimum_session_minutes INTEGER NOT NULL DEFAULT 30,
    workload_balance_weight DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    deadline_weight DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    priority_weight DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    preference_weight DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_scheduling_preferences_schedule ON scheduling_preferences(schedule_id);
