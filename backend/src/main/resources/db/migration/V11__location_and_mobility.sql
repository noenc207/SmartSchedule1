-- V11: Location domain, campus edges, and mobility warning acknowledgements
-- Seeded with DEMO_CAMPUS_DATA (Demo campus topology — replace with official FPTU Quy Nhơn campus data)

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'CAMPUS',
    building VARCHAR(100),
    room VARCHAR(60),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    campus_id VARCHAR(64),
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_locations_type CHECK (type IN ('ONLINE', 'CAMPUS', 'EXTERNAL', 'TBD'))
);

CREATE INDEX IF NOT EXISTS ix_locations_type ON locations(type);
CREATE INDEX IF NOT EXISTS ix_locations_campus ON locations(campus_id);

CREATE TABLE IF NOT EXISTS campus_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    walking_minutes INTEGER NOT NULL,
    distance_meters INTEGER,
    accessible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_campus_edges_positive CHECK (walking_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS ix_campus_edges_from ON campus_edges(from_location_id);
CREATE INDEX IF NOT EXISTS ix_campus_edges_to ON campus_edges(to_location_id);

CREATE TABLE IF NOT EXISTS mobility_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_event_id UUID,
    to_event_id UUID,
    signature VARCHAR(512) NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_mobility_ack_user_signature UNIQUE (user_id, signature)
);

CREATE INDEX IF NOT EXISTS ix_mobility_ack_user ON mobility_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS ix_mobility_ack_signature ON mobility_acknowledgements(signature);

-- Add optional location_id to events and tasks
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_events_location ON events(location_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_tasks_location ON tasks(location_id);

-- Seed DEMO_CAMPUS_DATA (Explicitly marked as demo topology)
INSERT INTO locations (id, name, type, building, room, campus_id, metadata)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Campus Building A', 'CAMPUS', 'Building A', 'A101', 'fptu-qn', 'Demo campus topology — replace with official FPTU Quy Nhon campus data'),
    ('10000000-0000-0000-0000-000000000002', 'Campus Building B', 'CAMPUS', 'Building B', 'B201', 'fptu-qn', 'Demo campus topology — replace with official FPTU Quy Nhon campus data'),
    ('10000000-0000-0000-0000-000000000003', 'Central Hall', 'CAMPUS', 'Central Hall', 'Hall 1', 'fptu-qn', 'Demo campus topology — replace with official FPTU Quy Nhon campus data'),
    ('10000000-0000-0000-0000-000000000004', 'Campus Lab', 'CAMPUS', 'Tech Wing', 'Lab 302', 'fptu-qn', 'Demo campus topology — replace with official FPTU Quy Nhon campus data'),
    ('10000000-0000-0000-0000-000000000005', 'Campus Library', 'CAMPUS', 'Learning Hub', 'Floor 2', 'fptu-qn', 'Demo campus topology — replace with official FPTU Quy Nhon campus data'),
    ('10000000-0000-0000-0000-000000000006', 'Campus Canteen', 'CAMPUS', 'Student Center', 'Floor 1', 'fptu-qn', 'Demo campus topology — replace with official FPTU Quy Nhon campus data'),
    ('10000000-0000-0000-0000-000000000007', 'Online / Virtual', 'ONLINE', NULL, NULL, NULL, 'Virtual event, no travel required')
ON CONFLICT (id) DO NOTHING;

-- Seed bidirectional campus walking edges
-- Building A <-> Central Hall = 4 min
INSERT INTO campus_edges (from_location_id, to_location_id, walking_minutes, distance_meters)
VALUES
    ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 4, 240),
    ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 4, 240),
    -- Central Hall <-> Campus Lab = 5 min (Total Building A -> Lab = 9 min via Central Hall)
    ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 5, 300),
    ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 5, 300),
    -- Building A <-> Library = 3 min
    ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 3, 180),
    ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 3, 180),
    -- Central Hall <-> Library = 3 min
    ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 3, 200),
    ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 3, 200),
    -- Central Hall <-> Building B = 4 min
    ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 4, 250),
    ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 4, 250),
    -- Building B <-> Canteen = 3 min
    ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 3, 180),
    ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 3, 180),
    -- Campus Lab <-> Canteen = 6 min
    ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 6, 360),
    ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 6, 360)
ON CONFLICT DO NOTHING;
