# SmartSchedule Phase 0 Architecture

## 1. Product analysis and architectural decisions

SmartSchedule is a planning system, not a calendar CRUD application. The system of record contains fixed commitments, flexible work, constraints, and the generated plan. Generated sessions remain traceable to their source task and generation run so users can understand and revise the result.

The initial deployment is a **modular monolith**:

```text
React SPA
  -> versioned REST API
  -> Spring Security / application services
  -> domain modules
  -> optimizer module
  -> PostgreSQL
```

The backend uses modules by business capability (`auth`, `schedule`, `event`, `task`, `availability`, `optimizer`, `sharing`, `collaboration`, `notification`) rather than technical layers alone. Each module follows controller -> application service -> repository/domain model boundaries. DTOs cross the HTTP boundary; JPA entities do not.

### Key decisions

| Area | Decision | Reason |
|---|---|---|
| Authentication | Short-lived JWT access token plus rotating refresh token stored hashed | Stateless API access without storing bearer tokens in plaintext |
| Time | Persist `timestamptz`/`Instant`; persist user IANA timezone on `users` | Correct DST and cross-member planning |
| Scheduling | Deterministic constraint pipeline plus explainable weighted scoring | Repeatable results, testability, no fake AI |
| Persistence | PostgreSQL + Flyway, `ddl-auto=validate` | Safe schema evolution |
| Sharing | Random opaque token mapped to a share link | Public URL never exposes database identifiers |
| Collaboration | Schedule membership with OWNER/EDITOR/VIEWER | Explicit authorization and future auditability |
| Frontend state | React Query for server cache and Zustand for session/UI state | Avoid duplicating remote data in global state |
| Calendar | FullCalendar React adapter | Mature drag, resize, views, and accessibility support |
| NLP | `ScheduleInputParser` interface with deterministic parser first | Future provider can be added without coupling core scheduling |

### Authentication architecture

The browser keeps the short-lived access JWT only in memory. It is sent as
`Authorization: Bearer <token>` and is never persisted to localStorage or
sessionStorage. The refresh token is a high-entropy opaque value stored only
as a SHA-256 hash in `refresh_tokens`; the raw value is sent only as an
HttpOnly cookie scoped to `/api/v1/auth`.

Register, login, and refresh issue an access token and a refresh cookie.
Refresh rotates the cookie: the current database row is revoked and linked to
the replacement row. Logout revokes the current refresh row and expires the
cookie. A revoked, expired, malformed, or unknown refresh token returns the
same generic `INVALID_REFRESH_TOKEN` response.

Access JWTs are signed with an environment-provided HMAC secret, contain the
user UUID subject, email, `type=access`, issued-at, and expiration, and default
to a 15-minute lifetime. Refresh tokens default to 30 days. Production
requires `SMARTSCHEDULE_JWT_SECRET` and `SMARTSCHEDULE_SECURE_COOKIE=true`.

CSRF strategy: business API calls authenticate with the in-memory Bearer token,
while the refresh cookie is `HttpOnly`, `SameSite=Lax`, path-scoped, and only
used on auth endpoints. CORS allows credentials only for explicitly configured
frontend origins. If the deployment later requires cross-site cookies, add a
CSRF token bound to the refresh session before changing `SameSite=None`.

### Authorization model

`CurrentUserService` resolves the authenticated UUID from `SecurityContext` and
loads the enabled, non-deleted user from the database. Client-provided user IDs
are not trusted. `AuthorizationService` is the single schedule permission
boundary: `requireViewer` permits owner/editor/viewer reads,
`requireEditor` permits owner/editor mutations, and `requireOwner` is required
for member management, sharing settings, and schedule lifecycle operations.
The canonical owner remains `schedules.owner_id`; new schedules do not require
an `OWNER` member row.

## 2. Requirements conflicts and assumptions

1. The requested API examples omit `/v1` in a few places; this design standardizes all endpoints under `/api/v1`.
2. “Logout” is implemented as refresh-token revocation; access tokens expire quickly.
3. Generated task sessions are represented as schedulable event records linked to a task. Fixed events cannot be moved by optimization.
4. “Public” sharing exposes only renderable schedule data, never private notes, member emails, or internal IDs.
5. PDF and QR are post-MVP adapters; the share-link contract is MVP.
6. Notifications begin as persisted in-app notifications. Email/push are adapters, not part of the first deployment.
7. Optimization runs synchronously for MVP with a bounded planning horizon. A job table/queue can be introduced when runtime measurements justify it.

## 3. Text ERD

```text
users
  1 ────< schedules (owner_id)
  1 ────< refresh_tokens
  1 ────< notifications

schedules
  1 ────< events
  1 ────< tasks
  1 ────< availabilities
  1 ────< schedule_members >──── 1 users
  1 ────< share_links
  1 ────< activity_logs
  1 ────< schedule_generation_runs

categories
  1 ────< events
  1 ────< tasks

tasks
  1 ────< task_sessions (generated event/session lineage)

events
  0..1 ──── 1 task_sessions (generated task session)

schedule_generation_runs
  1 ────< generated_schedule_items
generated_schedule_items >──── 0..1 events
generated_schedule_items >──── 0..1 tasks
```

### Entity responsibilities

- `User`: identity, password hash, timezone, locale, soft-delete marker.
- `RefreshToken`: hashed revocable token with expiry and last-used metadata.
- `Schedule`: planning workspace, owner, visibility, timezone, horizon defaults.
- `ScheduleMember`: schedule authorization (`OWNER`, `EDITOR`, `VIEWER`), unique per schedule/user.
- `Event`: fixed or flexible calendar commitment, recurrence metadata, lock flag, status.
- `Task`: work requirement with estimate, remaining duration, deadline, session bounds and preferences.
- `TaskSession`: generated session lineage and completion tracking.
- `Category`: user-owned label/color.
- `Availability`: recurring weekly rule or dated override, available/unavailable, local time range.
- `Constraint`: extensible schedule-level constraint configuration.
- `ScheduleGenerationRun`: input snapshot, status, score, timestamps, diagnostics.
- `GeneratedScheduleItem`: explainable output linking a task/event to a run and score components.
- `ShareLink`: opaque token, visibility, expiration/revocation.
- `Notification`: in-app notification with read state and source reference.
- `ActivityLog`: security/collaboration audit event.

### Important indexes and constraints

- Unique lower-case user email.
- Unique `(schedule_id, user_id)` membership.
- Unique share token.
- Index event/task time ranges by schedule and start/deadline.
- Index availability by schedule and weekday/date.
- Check end > start, non-negative durations, valid enum values.
- Foreign keys use restrictive deletes for ownership and cascading deletes only inside a schedule aggregate where safe.

## 4. REST API catalog

All authenticated endpoints use `/api/v1`.

### Auth

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Schedules and planning

```text
GET    /schedules
POST   /schedules
GET    /schedules/{scheduleId}
PUT    /schedules/{scheduleId}
DELETE /schedules/{scheduleId}
POST   /schedules/{scheduleId}/generate
POST   /schedules/{scheduleId}/optimize
POST   /schedules/{scheduleId}/reschedule
POST   /schedules/{scheduleId}/simulate
POST   /schedules/{scheduleId}/check-conflicts
GET    /schedules/{scheduleId}/generation-runs/{runId}
```

`generate` accepts a snapshot or uses persisted schedule inputs:

```json
{
  "horizonStart": "2026-09-21T00:00:00Z",
  "horizonEnd": "2026-09-28T00:00:00Z",
  "optimization": {
    "balanceWorkload": true,
    "respectPreferredPeriods": true,
    "avoidGaps": true
  }
}
```

The response is stable and renderable:

```json
{
  "status": "OPTIMIZED",
  "scheduledItems": [],
  "conflicts": [],
  "unscheduledTasks": [],
  "statistics": {
    "scheduledMinutes": 720,
    "unscheduledMinutes": 0,
    "conflictCount": 0
  }
}
```

### Events, tasks, availability, categories

```text
GET/POST        /events
GET/PUT/DELETE  /events/{eventId}
POST            /events/{eventId}/duplicate
POST            /events/check-conflict
GET             /schedules/{scheduleId}/conflicts?from=...&to=...

GET/POST        /tasks
GET/PUT/DELETE  /tasks/{taskId}

GET/POST        /availability
PUT/DELETE      /availability/{availabilityId}

GET/POST        /categories
PUT/DELETE      /categories/{categoryId}
```

Phase 2 persists availability as schedule-scoped weekly rules because the
existing V1 table has `schedule_id`. The API supports both the canonical
schedule-scoped form and a compatibility form requiring `scheduleId`:

```text
GET/POST /schedules/{scheduleId}/availability
GET/POST /availability?scheduleId={scheduleId}
PUT/DELETE /availability/{availabilityId}
```

List endpoints support `page`, `size`, `from`, `to`, `status`, and `sort` where applicable.

### Sharing, collaboration, notifications

```text
POST   /schedules/{scheduleId}/share
GET    /shared/{token}
DELETE /schedules/{scheduleId}/share/{shareLinkId}

GET    /schedules/{scheduleId}/members
POST   /schedules/{scheduleId}/members
PUT    /schedules/{scheduleId}/members/{memberId}
DELETE /schedules/{scheduleId}/members/{memberId}

GET    /notifications
POST   /notifications/{notificationId}/read
```

### Consistent errors

```json
{
  "timestamp": "2026-09-21T08:00:00Z",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "path": "/api/v1/tasks",
  "fieldErrors": {
    "deadline": "must be after the current time"
  },
  "traceId": "..."
}
```

## 5. Scheduling engine design

The optimizer is a pure application component wherever possible. It receives an immutable `PlanningSnapshot` and returns an immutable `SchedulePlan`.

```text
ConstraintBuilder
  -> normalize fixed events, availability, tasks, preferences
SlotGenerator
  -> produce bounded candidate slots from availability minus hard blocks
ConflictDetector
  -> detect overlap, deadline impossibility, overload, and insufficient time
FeasibilityChecker
  -> enforce hard constraints for each candidate
ScoreCalculator
  -> calculate isolated score components
ScheduleOptimizer
  -> select sessions using deterministic best-first search with bounded backtracking
PlanAssembler
  -> create sessions, conflicts, explanations, and statistics
Rescheduler
  -> preserve completed/fixed work and return ranked alternatives
SimulationEngine
  -> evaluate a copy of the snapshot; never persist
```

### Hard constraints

Fixed/locked events, unavailable windows, invalid ranges, horizon boundaries, deadline, minimum session duration, and no overlap are never traded away.

### Soft score

Each candidate receives a transparent score:

```text
total =
  wPriority * priorityScore
  + wDeadline * deadlineUrgencyScore
  + wPreference * preferredPeriodScore
  + wBalance * workloadBalanceScore
  + wContinuity * sessionContinuityScore
  - wGap * unnecessaryGapPenalty
  - wOverload * overloadPenalty
```

The score breakdown is stored with each generated item. If no feasible plan exists, the engine returns a partial plan and explicit conflict/unscheduled reasons; it never silently drops work.

### Deterministic search strategy

1. Normalize all dates into the schedule timezone and split recurring availability into concrete windows.
2. Reserve fixed events and existing locked sessions.
3. Rank tasks by hard deadline, priority, and remaining work.
4. Generate session sizes between min/max bounds, capped by maximum continuous work.
5. Generate candidates at the configured granularity (default 15 minutes).
6. Reject hard conflicts.
7. Score feasible candidates.
8. Select the best candidate, update daily load, and bounded-backtrack when a later deadline becomes infeasible.
9. Run conflict detection on the final plan and assemble explanations.

This is not random greedy scheduling: task ordering, candidate ordering, scoring, and backtracking are deterministic and covered by unit tests.

## 6. Frontend routes

```text
/                 -> redirect to /dashboard or /login
/login
/register
/dashboard
/calendar
/tasks
/schedules
/schedules/:scheduleId
/schedules/:scheduleId/generate
/schedules/:scheduleId/reschedule
/schedules/:scheduleId/simulate
/shared/:token
/settings
```

Authenticated shell: responsive sidebar on desktop, agenda-first bottom navigation on mobile. Remote data uses query caching; forms use React Hook Form + Zod; drag/resize uses optimistic update with rollback.

## 6.1 Target frontend folder structure

```text
frontend/src/
├── app/
│   ├── App.tsx
│   ├── providers/
│   └── queryClient.ts
├── components/
│   ├── ui/
│   ├── feedback/
│   └── layout/
├── features/
│   ├── auth/
│   ├── calendar/
│   ├── tasks/
│   ├── schedules/
│   ├── optimizer/
│   ├── collaboration/
│   └── sharing/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
│   ├── apiClient.ts
│   └── resources/
├── stores/
├── types/
├── utils/
├── main.tsx
└── styles.css
```

Feature folders own their API hooks, schemas, types, and presentational components; cross-feature primitives live in `components/ui`.

## 6.2 Target Java folder structure

```text
backend/src/main/java/com/smartschedule/
├── SmartScheduleApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   └── JacksonConfig.java
├── common/
│   ├── error/
│   ├── web/
│   ├── audit/
│   └── time/
├── auth/
│   ├── api/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
├── user/
├── schedule/
├── event/
├── task/
├── category/
├── availability/
├── notification/
├── sharing/
├── collaboration/
└── optimizer/
    ├── api/
    ├── application/
    ├── domain/
    ├── scoring/
    └── infrastructure/
```

Each business module keeps request/response DTOs in `api`, use cases in `application`, invariants and value objects in `domain`, and Spring Data/JPA adapters in `infrastructure`. The optimizer domain must remain independent of HTTP and JPA.

## 7. MVP versus advanced

### MVP demo

- Registration/login/logout/me with JWT refresh rotation.
- One or more private schedules.
- Event/task/category CRUD.
- Weekly availability and dated overrides.
- Calendar day/week/month/list views, drag and resize.
- Conflict detection with severity and reasons.
- Real deterministic schedule generation with split task sessions.
- Reschedule alternatives with explicit apply.
- In-app notifications.
- Opaque share links with read-only public view.
- Docker Compose, migrations, unit/integration tests.

### Advanced after MVP

- Team common-availability meeting suggestions.
- What-if simulation UI with diff and apply.
- QR/PDF export.
- Natural-language deterministic parser, then optional provider adapter.
- Email/browser push adapters.
- Async optimization jobs and progress streaming.
- Recurrence rule editor, import/export, analytics, and calendar integrations.

## 8. Implementation sequence

1. Repository/tooling baseline and Docker health checks.
2. Database migration, common errors, security, auth.
3. Schedule/member authorization and CRUD.
4. Event/task/category/availability CRUD.
5. Calendar and dashboard read models.
6. Conflict detector and API.
7. Scheduling engine and generation persistence.
8. Reschedule and apply workflow.
9. Simulation isolation.
10. Sharing and collaboration.
11. Notifications, responsive/accessibility polish.
12. Full test matrix, observability, production deployment documentation.

Every phase must pass compile, targeted tests, and API smoke checks before the next phase starts.

## 8.1 Phase 2 domain decisions

Phase 2 keeps `Event` as a concrete time interval and `Task` as unscheduled
work. Event timestamps use `Instant` in JSON and PostgreSQL `timestamptz`.
Availability uses `LocalTime` and ISO weekday numbers (1=Monday through
7=Sunday), interpreted in the owning Schedule's IANA timezone.

Categories remain user-owned and can be referenced by events/tasks only after
the category owner has been authorized. Events, tasks, and availability are
schedule-scoped. The current phase permits only schedule owners to mutate
these resources; `ScheduleMember` and `AuthorizationService` are the extension
point for EDITOR/VIEWER access in collaboration work.

## 9. Decisions to confirm before production rollout

- Default planning timezone behavior when a schedule is shared across timezones.
- Whether generated sessions may be manually edited or become locked after completion.
- Exact retention policy for activity logs and revoked refresh tokens.
- Email provider and browser push strategy.
- Maximum synchronous planning horizon and request timeout.
- Whether public schedules show task descriptions and completion status.

## 10. Phase 2 completion boundary

Phase 2 deliberately does not implement recurrence expansion, drag-and-drop
event persistence, conflict detection, task scheduling, collaboration
permissions, or optimizer behavior. It provides the stable domain boundary:

```text
Schedule
  ├── Event       concrete time interval
  ├── Task        unscheduled work requirement
  ├── Availability weekly usable window
  └── Category    user-owned classification
```

The next phase can add recurring-event expansion and calendar interactions
without changing the distinction between fixed events and unscheduled tasks.

## 11. Phase 3 calendar architecture

### Calendar adapter and state

The backend `Event` is the domain model. FullCalendar objects are created by
`features/calendar/utils/eventMapper.ts` and carry the domain event in
`extendedProps`; FullCalendar types do not cross into API services or domain
types. Calendar range requests are bounded by the visible view and guarded by
a request sequence so stale schedule responses cannot replace the active
schedule.

### Timezone strategy

Event instants are stored as PostgreSQL `timestamptz` and exposed as ISO
instants. A Schedule's IANA `timezone` is the source of truth for the calendar
display and for converting `datetime-local` form values to instants. The
browser timezone is used only as a fallback before a schedule is selected.
`Intl.DateTimeFormat` performs named-zone conversion, including DST; no fixed
GMT offset is hard-coded.

### Recurrence strategy

`events.recurrence_rule` stores a validated JSON representation inside the
existing V1 column (no schema migration was needed):

```json
{
  "frequency": "WEEKLY",
  "interval": 1,
  "byWeekdays": [1, 3],
  "until": null,
  "count": null
}
```

The backend expands only the requested range. Occurrence IDs are deterministic
UUIDs derived from `seriesId + occurrenceStart`, so rendering and future
exception support have stable identity. Phase 3 edits and deletes the entire
series; “this occurrence” exceptions are intentionally not claimed until an
exception model is added.

### Conflict pre-check and optimistic mutations

`EventConflictService` checks overlap against authorized events and recurring
occurrences without blocking persistence. `POST /api/v1/events/check-conflict`
returns structured overlap minutes. Create/edit can warn and let the user save
anyway. Drag and resize snapshot the original event, update the calendar
optimistically, call the authorized update API, and call FullCalendar's revert
plus restore local state on failure.

### Phase 4 conflict detection

`ConflictAnalysisService` provides a bounded, read-only analysis endpoint:
`GET /api/v1/schedules/{scheduleId}/conflicts?from=...&to=...`. It expands
recurring events through `RecurrenceService` and reports structured findings
with `type`, `severity`, explanation, time range, related resource, and
minutes. The current types are event overlap, availability violation,
deadline infeasibility, and overloaded day. Fixed/locked overlaps are errors;
flexible overlaps are warnings. Deadline feasibility is evaluated only when
the schedule has availability rules, and generated task sessions are not yet
present in the domain, so task-session conflict analysis remains reserved for
the scheduling phase.

### Phase 5 scheduling engine

The scheduling engine is a deterministic, bounded pipeline:

```text
Tasks + Events + Availability + Preferences
        -> SchedulingContext
        -> CandidateSlotGenerator
        -> Hard-constraint filter
        -> Priority/deadline/preference/balance scoring
        -> Greedy placement + bounded improvement
        -> SchedulePlan
        -> validation
        -> preview or transactional apply
```

Tasks remain requirements and are not converted into events during creation.
The generated plan is a preview identified by a server-issued plan ID.
Candidate sessions are generated only from recurring availability after all
existing events, including recurring occurrences, are expanded as occupied
intervals. Existing flexible events are not moved in Phase 5.

Hard constraints are planning range, deadline, availability, event overlap,
minimum/maximum session duration, and maximum daily workload. Soft scoring
prioritizes urgency, priority, preferred time, balance, and continuity. The
deadline urgency component uses:

```text
remaining task minutes / available minutes before deadline
```

The engine uses stable sorting and no random values. Candidate counts,
iterations, backtracks, optimization iterations, and elapsed time are bounded
and returned as non-sensitive diagnostics. A plan can be `FEASIBLE`, `PARTIAL`,
or `INFEASIBLE`; an optimized response is only returned after hard-constraint
validation.

The frontend exposes `/scheduling` for range/task/preference setup, preview,
generated slot review, and explicit apply. Apply rechecks authorization and
current data in a transaction and rejects a stale plan rather than
overwriting newer calendar/task changes. Generated sessions are materialized
as events with `generated_plan_id` and `source_task_id`; tasks themselves are
not mutated into events. Reapplying the same plan is idempotent.

The current implementation uses deterministic greedy placement plus a bounded
single-pass improvement. Existing events are treated as occupied and are not
moved. Preferences are currently served through a clean API abstraction with
documented defaults; durable preference persistence and detailed unscheduled
diagnostic records are reserved for the next iteration. Phase 5 intentionally
does not use an LLM, optimize team schedules, or implement what-if
rescheduling.

### Phase 6 smart rescheduling

Rescheduling is partial re-optimization rather than a blind full regeneration:

```text
Change snapshot
  -> impact analysis
  -> affected generated sessions
  -> preserve unaffected sessions
  -> bounded candidate generation
  -> deterministic alternatives
  -> merge and validate full schedule
  -> explicit transactional apply
```

Generated sessions are identified through `source_task_id` and
`generated_plan_id`. User-created events remain immutable blockers. Impact
analysis classifies sessions as directly affected, indirectly affected, or
unaffected and reports lost capacity, conflicts, and preserved work.

Alternative ranking combines preservation, deadline margin, priority,
preference, workload, and change cost. Change cost penalizes moved sessions,
moved minutes, date changes, preferred-window loss, and continuity breaks.
The response exposes metrics and reason codes rather than naming an option
“best”.

What-if requests run against an in-memory snapshot and never insert temporary
events or mutate tasks, availability, or persisted events. Apply rechecks the
fingerprint and hard constraints, then updates only affected generated
sessions in one transaction. Phase 6 does not yet provide team rescheduling,
automatic event movement, or persisted plan history.

#### Phase 5 technical-debt audit

Phase 6 addresses the rescheduling-critical debt:

| Phase 5 item | Phase 6 outcome |
|---|---|
| Preferences not persisted | Resolved with schedule-scoped V6 persistence |
| Unscheduled diagnostics | Still partial; rescheduling exposes impact and capacity metrics |
| Placement reasons | Rescheduling alternatives expose reason codes |
| Backtracking | Still bounded greedy/single-pass; deeper search remains |
| Break rule | Preference is persisted; full hard/soft enforcement remains |
| Daily workload scorer | Not yet an independent reusable scorer |
| Calendar refresh after apply | Still follow-up integration work |
| Frontend scheduling tests | Existing Vitest passes; RTL coverage remains |
| Backend integration tests | Blocked until Java/Maven/PostgreSQL runtime is available |

### Phase 7 collaboration, team availability, and sharing

Schedules can be listed as owned or shared, with `OWNER`, `EDITOR`, and
`VIEWER` permissions enforced in the backend. Event and task access inherits
the schedule permission; viewers are read-only and editors cannot manage
members or sharing settings.

Member management is immediate for existing accounts. Public links use
cryptographically random tokens, store only their SHA-256 hash in the existing
`share_links.token` column, support expiration and revocation, and expose a
dedicated public DTO containing only safe calendar fields. Public links never
grant authenticated mutation access.

Team availability is returned as an aggregate rather than individual member
availability. The current schema uses schedule-scoped availability rules, so
the Phase 7 MVP reports common schedule windows while preserving the privacy
boundary; personal per-member availability requires a later
`user_availabilities` migration. Activity actions are persisted in the existing
`activity_logs` table and exposed as a bounded recent-activity feed.

### Phase 8 production hardening

Schedule versioning is a monotonic application-level counter stored on
`schedules.version`. Domain mutations increment it; generated scheduling plans
capture it, and apply rejects a supplied stale version with
`RESOURCE_VERSION_CONFLICT`. The existing fingerprint remains as a detailed
state validation layer.

Notifications are user-owned records with a related resource, optional due
time, read timestamp, and unique idempotency key. The reminder scheduler runs
with Spring's bounded scheduling abstraction and only examines a bounded
48-hour horizon. It creates event reminders deterministically and can be run
repeatedly without duplicates. Future deadline and preference jobs can reuse
the same notification boundary.

Recurrence exceptions are separate rows keyed by series event and occurrence
start. Expansion generates occurrences first, then applies `MODIFIED` or
`CANCELLED` exceptions. The current API supports single-occurrence exceptions;
series splitting for “this and following” remains intentionally deferred.

ICS interoperability is bounded and server-side. Export requires schedule
viewer permission and omits internal IDs and private audit data. Import is
preview/confirm, limits file size and event count, validates time ranges, and
does not mutate the schedule during preview.

Production configuration uses environment-provided secrets and explicit CORS
origins in the prod profile. Security headers are set by Spring Security and
Nginx, the backend container runs as a non-root user, and Compose health checks
gate dependent services. Runtime migration and integration validation must be
performed in an environment with Java 21, Maven, Docker, and PostgreSQL.
