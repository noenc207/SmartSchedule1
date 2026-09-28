ALTER TABLE events ADD COLUMN generated_plan_id UUID;
ALTER TABLE events ADD COLUMN source_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX ix_events_generated_plan ON events(generated_plan_id);
CREATE INDEX ix_events_source_task ON events(source_task_id);
