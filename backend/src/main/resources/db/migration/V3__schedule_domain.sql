ALTER TABLE categories ADD COLUMN icon VARCHAR(80);
ALTER TABLE tasks ADD COLUMN owner_id UUID REFERENCES users(id);

UPDATE tasks t
SET owner_id = s.owner_id
FROM schedules s
WHERE t.schedule_id = s.id AND t.owner_id IS NULL;

ALTER TABLE tasks ALTER COLUMN owner_id SET NOT NULL;
CREATE INDEX ix_tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX ix_tasks_schedule_deadline_status ON tasks(schedule_id, deadline, status);
CREATE INDEX ix_events_schedule_end ON events(schedule_id, ends_at);
CREATE INDEX ix_availability_schedule_weekday ON availabilities(schedule_id, weekday);
