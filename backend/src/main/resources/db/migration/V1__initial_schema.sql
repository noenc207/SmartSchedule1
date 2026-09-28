CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(16) NOT NULL DEFAULT 'en',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email));

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(160) NOT NULL,
    description VARCHAR(2000),
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    visibility VARCHAR(16) NOT NULL DEFAULT 'PRIVATE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_schedules_visibility CHECK (visibility IN ('PRIVATE', 'PUBLIC', 'SHARED'))
);
CREATE INDEX ix_schedules_owner ON schedules(owner_id);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_id, name)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(16) NOT NULL DEFAULT 'CONFIRMED',
    recurrence_rule VARCHAR(1000),
    reminder_minutes INTEGER,
    notes TEXT,
    fixed BOOLEAN NOT NULL DEFAULT TRUE,
    locked BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_events_range CHECK (ends_at > starts_at)
);
CREATE INDEX ix_events_schedule_time ON events(schedule_id, starts_at, ends_at);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_minutes INTEGER NOT NULL,
    remaining_minutes INTEGER NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    deadline TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    preferred_start TIME,
    preferred_end TIME,
    minimum_session_minutes INTEGER NOT NULL DEFAULT 30,
    maximum_session_minutes INTEGER NOT NULL DEFAULT 120,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_tasks_minutes CHECK (estimated_minutes > 0 AND remaining_minutes >= 0),
    CONSTRAINT ck_tasks_session CHECK (minimum_session_minutes > 0 AND maximum_session_minutes >= minimum_session_minutes)
);
CREATE INDEX ix_tasks_schedule_deadline ON tasks(schedule_id, deadline);

CREATE TABLE availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    weekday SMALLINT,
    specific_date DATE,
    starts_at TIME NOT NULL,
    ends_at TIME NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_availability_range CHECK (ends_at > starts_at),
    CONSTRAINT ck_availability_target CHECK (weekday IS NOT NULL OR specific_date IS NOT NULL)
);
CREATE INDEX ix_availability_schedule_day ON availabilities(schedule_id, weekday, specific_date);

CREATE TABLE schedule_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(schedule_id, user_id),
    CONSTRAINT ck_member_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))
);

CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    token VARCHAR(96) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read_at TIMESTAMPTZ,
    source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user_unread ON notifications(user_id, read_at, created_at);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
