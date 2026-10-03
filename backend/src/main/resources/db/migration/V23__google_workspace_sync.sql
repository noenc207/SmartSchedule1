-- V23: Google Workspace Integration & Sync (Sheets & Calendar)

CREATE TABLE IF NOT EXISTS google_connections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'GOOGLE_WORKSPACE',
    encrypted_credentials TEXT NOT NULL,
    scopes VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_google_connections_user_revoked
    ON google_connections (user_id, revoked_at);

CREATE TABLE IF NOT EXISTS external_calendar_links (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'GOOGLE_CALENDAR',
    external_calendar_id VARCHAR(255) NOT NULL,
    smart_calendar_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    sync_status VARCHAR(32) NOT NULL DEFAULT 'LINKED',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_external_calendar_user UNIQUE (user_id, provider, external_calendar_id)
);

CREATE TABLE IF NOT EXISTS external_event_links (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'GOOGLE_CALENDAR',
    external_calendar_id VARCHAR(255) NOT NULL,
    external_event_id VARCHAR(255) NOT NULL,
    smart_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED',
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_external_event_user UNIQUE (user_id, provider, external_calendar_id, external_event_id)
);

CREATE TABLE IF NOT EXISTS google_import_jobs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    rows_processed INT NOT NULL DEFAULT 0,
    events_detected INT NOT NULL DEFAULT 0,
    events_created INT NOT NULL DEFAULT 0,
    conflicts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_import_jobs_user
    ON google_import_jobs (user_id, created_at DESC);
