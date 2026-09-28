-- V12: Multi-Tenancy (Data Isolation) and User_Locations (Dynamic Location Engine)
-- Ensures strict isolation across institutions and organizations via user_id and workspace_id.

-- 1. Create user_locations table for Custom POIs
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'CUSTOM',
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 100,
    building VARCHAR(100),
    room VARCHAR(60),
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_locations_category CHECK (
        category IN ('HOME', 'OFFICE', 'CAFE', 'CAMPUS', 'GYM', 'ONLINE', 'CUSTOM', 'TBD')
    )
);

CREATE INDEX IF NOT EXISTS ix_user_locations_tenant ON user_locations(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS ix_user_locations_category ON user_locations(category);

-- 2. Multi-tenancy enforcement columns on existing entities
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS workspace_id UUID;
CREATE INDEX IF NOT EXISTS ix_events_tenant ON events(user_id, workspace_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id UUID;
CREATE INDEX IF NOT EXISTS ix_tasks_tenant ON tasks(user_id, workspace_id);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS workspace_id UUID;
CREATE INDEX IF NOT EXISTS ix_categories_tenant ON categories(user_id, workspace_id);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS workspace_id UUID;
CREATE INDEX IF NOT EXISTS ix_schedules_tenant ON schedules(user_id, workspace_id);

ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS workspace_id UUID;
CREATE INDEX IF NOT EXISTS ix_availability_tenant ON availabilities(user_id, workspace_id);

-- 3. Open API and LMS/HR integration keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    scopes VARCHAR(255) NOT NULL DEFAULT 'events:write,schedules:read',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_api_keys_prefix UNIQUE (key_prefix)
);

CREATE INDEX IF NOT EXISTS ix_api_keys_tenant ON api_keys(user_id, workspace_id);
