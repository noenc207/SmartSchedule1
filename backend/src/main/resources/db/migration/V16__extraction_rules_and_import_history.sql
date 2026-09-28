-- ==============================================================================
-- V16: Universal Portal Extraction Rules & Idempotent Schedule Import Pipeline
-- ==============================================================================

-- 1. Extend Events Table for Universal Portal Integration & Idempotency
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS source VARCHAR(64);

CREATE INDEX IF NOT EXISTS ix_events_schedule_external
    ON events(schedule_id, external_id)
    WHERE external_id IS NOT NULL;

-- 2. Dynamic Extraction Rules Table for University Portal Adapters
CREATE TABLE IF NOT EXISTS extraction_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    domains TEXT NOT NULL,
    path_pattern VARCHAR(255),
    rule_json TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_extraction_rules_enabled
    ON extraction_rules(enabled, priority DESC);

-- 3. Audit Log for Schedule Imports (History & Tracking)
CREATE TABLE IF NOT EXISTS schedule_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(64) NOT NULL,
    rule_id VARCHAR(64),
    rule_version INTEGER,
    total_detected INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    conflict_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_schedule_imports_schedule
    ON schedule_imports(schedule_id, created_at DESC);

-- 4. Initial Seed Extraction Rules
INSERT INTO extraction_rules (id, name, provider, version, domains, path_pattern, rule_json, checksum, enabled, priority)
VALUES
(
    'fpt-fap',
    'FPT Academic Portal (FAP)',
    'FAP',
    1,
    'fap.fpt.edu.vn,*.fpt.edu.vn,localhost,127.0.0.1',
    'Schedule|Report|ScheduleOfWeek',
    '{"id":"fpt-fap","name":"FPT Academic Portal (FAP)","provider":"FAP","version":1,"enabled":true,"priority":100,"domains":["fap.fpt.edu.vn","*.fpt.edu.vn","localhost","127.0.0.1"],"pathMatch":"Schedule|Report|ScheduleOfWeek","waitFor":"table","mode":"table-rows","rowSelector":"table.schedule-table tbody tr, table#ctl00_mainContent_divSelect table tr:not(:first-child), table.table-bordered tbody tr:not(:first-child)","fields":{"title":{"selector":".subject-name, td.subject, a[href*=\"Subject\"], td:nth-child(3)","source":"text","optional":false,"trim":true},"courseCode":{"selector":".course-code, td.code, a[href*=\"Course\"], td:nth-child(2)","source":"text","regex":"([A-Z]{2,4}\\d{3,4}[A-Z]?)","regexGroup":1,"optional":true,"trim":true},"date":{"selector":".session-date, td.date, td:nth-child(1)","source":"text","regex":"(\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})","regexGroup":1,"optional":false,"trim":true},"timeRange":{"selector":".session-time, td.time, td.slot, td:nth-child(4)","source":"text","regex":"(\\d{1,2}[:h]\\d{2}\\s*[-–—to]+\\s*\\d{1,2}[:h]\\d{2})","regexGroup":1,"optional":true,"trim":true},"location":{"selector":".session-room, td.room, td:nth-child(5)","source":"text","regex":"(?:Phòng|Room)?\\s*([A-Za-z0-9_.-]+)","regexGroup":1,"optional":true,"trim":true},"teacher":{"selector":".session-teacher, td.lecturer, td:nth-child(6)","source":"text","regex":"(?:GV|Lecturer|Teacher)?:?\\s*([A-Za-z0-9_.-]+)","regexGroup":1,"optional":true,"trim":true},"group":{"selector":".session-class, td.class, td:nth-child(7)","source":"text","optional":true,"trim":true},"slot":{"selector":".session-slot, td.slot-num","source":"text","regex":"(?:Slot|Ca)\\s*(\\d+)","regexGroup":1,"optional":true,"trim":true}},"dateFormat":"DD/MM/YYYY","timeFormat":"HH:mm","timezone":"Asia/Ho_Chi_Minh"}',
    'fap-v1-verified',
    true,
    100
),
(
    'edusoft-portal',
    'Edusoft University Portal',
    'EDUSOFT',
    1,
    'edusoftweb.hcmiu.edu.vn,*.edusoft.vn,daotao.vnu.edu.vn',
    'ThoiKhoaBieu|Schedule',
    '{"id":"edusoft-portal","name":"Edusoft University Portal","provider":"EDUSOFT","version":1,"enabled":true,"priority":90,"domains":["edusoftweb.hcmiu.edu.vn","*.edusoft.vn","daotao.vnu.edu.vn"],"pathMatch":"ThoiKhoaBieu|Schedule","waitFor":"table.grid","mode":"table-rows","rowSelector":"table.grid tbody tr, table#tblThoiKhoaBieu tbody tr","fields":{"title":{"selector":"td.col-mon, td:nth-child(3)","source":"text","optional":false,"trim":true},"courseCode":{"selector":"td.col-mamon, td:nth-child(2)","source":"text","regex":"([A-Z0-9]+)","regexGroup":1,"optional":true,"trim":true},"date":{"selector":"td.col-ngay, td:nth-child(4)","source":"text","regex":"(\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})","regexGroup":1,"optional":false,"trim":true},"timeRange":{"selector":"td.col-gio, td:nth-child(5)","source":"text","regex":"(\\d{1,2}[:h]\\d{2}\\s*[-–—]+\\s*\\d{1,2}[:h]\\d{2})","regexGroup":1,"optional":true,"trim":true},"location":{"selector":"td.col-phong, td:nth-child(6)","source":"text","optional":true,"trim":true},"teacher":{"selector":"td.col-gv, td:nth-child(7)","source":"text","optional":true,"trim":true},"group":{"selector":"td.col-nhom, td:nth-child(8)","source":"text","optional":true,"trim":true}},"dateFormat":"DD/MM/YYYY","timeFormat":"HH:mm","timezone":"Asia/Ho_Chi_Minh"}',
    'edusoft-v1-scaffold',
    true,
    90
)
ON CONFLICT (id) DO NOTHING;
