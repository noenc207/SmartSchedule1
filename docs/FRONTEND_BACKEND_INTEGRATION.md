# SMARTSCHEDULE — FRONTEND ↔ BACKEND INTEGRATION AUDIT

**Project:** SmartSchedule  
**Frontend Path:** `D:\SmartSchedul\frontend`  
**Backend Path:** `D:\SmartSchedul\backend`  
**Date:** 2026-09-24  
**Audit Purpose:** Comprehensive mapping of all frontend features, services, and API calls against the verified Spring Boot backend before code modification.

---

## 1. INTEGRATION MAPPING TABLE

| Feature | Frontend Source | API Called | Backend Endpoint | Contract / DTO Match | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Auth — Register** | `features/auth/AuthPages.tsx`<br>`stores/authStore.ts` | `authApi.register(input)` | `POST /api/v1/auth/register` | `RegisterRequest(displayName, email, password)`<br>→ `AuthResponse(accessToken, expiresIn, user)` | **CONNECTED** |
| **Auth — Login** | `features/auth/AuthPages.tsx`<br>`stores/authStore.ts` | `authApi.login(input)` | `POST /api/v1/auth/login` | `LoginRequest(email, password)`<br>→ `AuthResponse(accessToken, expiresIn, user)` | **CONNECTED** |
| **Auth — Refresh** | `services/apiClient.ts`<br>`stores/authStore.ts` | `authApi.refresh()` | `POST /api/v1/auth/refresh` | Cookie `smartschedule_refresh`<br>→ `AuthResponse(accessToken, expiresIn, user)` | **CONNECTED** |
| **Auth — Current User** | `services/authApi.ts`<br>`stores/authStore.ts` | `authApi.me()` | `GET /api/v1/auth/me` | Bearer Header<br>→ `UserResponse(id, email, displayName, avatarUrl, enabled, timezone, locale, createdAt)` | **CONNECTED** |
| **Auth — Logout** | `features/app/App.tsx`<br>`stores/authStore.ts` | `authApi.logout()` | `POST /api/v1/auth/logout` | Revokes DB hash & clears HttpOnly cookie | **CONNECTED** |
| **Auth — Google OAuth** | None | None | None | No backend Google OAuth endpoints. | **UNKNOWN**<br>*(NOT YET INTEGRATED)* |
| **User Profile — Read** | `stores/authStore.ts`<br>`services/userApi.ts` | `userApi.get()` | `GET /api/v1/users/me` | Fetches active profile from backend database. | **CONNECTED** |
| **User Profile — Update** | `features/settings/SettingsPage.tsx`<br>`services/userApi.ts` | `userApi.update(input)` | `PATCH /api/v1/users/me` | `UpdateUserRequest(name, avatarUrl, timezone, locale)` → `UserResponse`. Connected to Settings UI. | **CONNECTED** |
| **Schedules — List** | `features/schedules/SchedulesPage.tsx`<br>`app/App.tsx` | `scheduleApi.list()` | `GET /api/v1/schedules` | `List<ScheduleSummaryResponse>` | **CONNECTED** |
| **Schedules — Create** | `features/schedules/SchedulesPage.tsx` | `scheduleApi.create(input)` | `POST /api/v1/schedules` | `CreateScheduleRequest(name, description, timezone, visibility)` → `ScheduleResponse` | **CONNECTED** |
| **Schedules — Get By ID** | `services/scheduleApi.ts` | `scheduleApi.get(id)` | `GET /api/v1/schedules/{id}` | `ScheduleResponse` with `version`. | **CONNECTED** |
| **Schedules — Update** | `features/schedules/SchedulesPage.tsx` | `scheduleApi.update(id, input)` | `PUT /api/v1/schedules/{id}` | `UpdateScheduleRequest` → `ScheduleResponse` | **CONNECTED** |
| **Schedules — Delete** | `features/schedules/SchedulesPage.tsx` | `scheduleApi.remove(id)` | `DELETE /api/v1/schedules/{id}` | HTTP 204 No Content | **CONNECTED** |
| **Events — List** | `features/calendar/CalendarPage.tsx`<br>`dashboard/hooks/useDashboardData.ts` | `eventApi.list(scheduleId, from, to)` | `GET /api/v1/schedules/{scheduleId}/events` | Query params `from`, `to` → `List<EventResponse>` | **CONNECTED** |
| **Events — Create** | `features/calendar/CalendarPage.tsx` | `eventApi.create(scheduleId, input)` | `POST /api/v1/schedules/{scheduleId}/events` | `EventRequest` supports `sourceTaskId` / `taskId`. Backend automatically recalculates task remaining duration. | **CONNECTED** |
| **Events — Get** | `features/calendar/CalendarPage.tsx` | `eventApi.get(id)` | `GET /api/v1/events/{id}` | `EventResponse` | **CONNECTED** |
| **Events — Update** | `features/calendar/CalendarPage.tsx` | `eventApi.update(id, input)` | `PUT /api/v1/events/{id}` | `EventRequest` → `EventResponse`. Recalculates task remaining duration. Preserves `sourceTaskId` in `toInput`. | **CONNECTED** |
| **Events — Delete** | `features/calendar/CalendarPage.tsx` | `eventApi.remove(id)` | `DELETE /api/v1/events/{id}` | HTTP 204. Recalculates task remaining duration. Re-fetches task authority without overwriting. | **CONNECTED** |
| **Events — Duplicate** | `features/calendar/CalendarPage.tsx` | `eventApi.duplicate(id)` | `POST /api/v1/events/{id}/duplicate` | `EventResponse` | **CONNECTED** |
| **Events — Task Linkage** | `features/calendar/CalendarPage.tsx`<br>`calendar/utils/eventMapper.ts`<br>`calendar/utils/longRangeMetrics.ts` | `item.sourceTaskId || item.taskId` | `EventResponse.sourceTaskId` (`@JsonProperty("taskId")`) | Fully unified to prioritize canonical `sourceTaskId` with graceful fallback. | **CONNECTED** |
| **Tasks — List** | `features/tasks/TasksPage.tsx`<br>`features/calendar/CalendarPage.tsx` | `taskApi.list(scheduleId)` | `GET /api/v1/schedules/{scheduleId}/tasks` | Returns `PageResponse<Task>`. Normalized via `normalizeTask`. | **CONNECTED** |
| **Tasks — Create** | `features/tasks/TasksPage.tsx` | `taskApi.create(scheduleId, input)` | `POST /api/v1/schedules/{scheduleId}/tasks` | `TaskRequest` → `TaskResponse` | **CONNECTED** |
| **Tasks — Get** | `features/calendar/CalendarPage.tsx`<br>`services/taskApi.ts` | `taskApi.get(id)` | `GET /api/v1/tasks/{id}` | `TaskResponse` | **CONNECTED** |
| **Tasks — Update** | `features/tasks/TasksPage.tsx`<br>`features/scheduling/SchedulingPage.tsx` | `taskApi.update(id, input)` | `PUT /api/v1/tasks/{id}` | `TaskRequest` → `TaskResponse` | **CONNECTED** |
| **Tasks — Delete** | `features/tasks/TasksPage.tsx` | `taskApi.remove(id)` | `DELETE /api/v1/tasks/{id}` | HTTP 204 No Content | **CONNECTED** |
| **Tasks — Duration Authority** | `services/taskApi.ts`<br>`features/scheduling/SchedulingPage.tsx` | Backend recalculation + `taskApi.get` | `Task.remainingDurationMinutes` | Authoritative on backend. Frontend never overwrites calculated remaining duration. | **CONNECTED** |
| **Categories — CRUD** | `features/settings/SettingsPage.tsx` | `categoryApi.list/create/update/remove` | `/api/v1/categories` | Complete REST CRUD | **CONNECTED** |
| **Availability — CRUD** | `features/settings/SettingsPage.tsx` | `availabilityApi.list/create/update/remove` | `/api/v1/schedules/{id}/availability` | Complete REST CRUD (`dayOfWeek`, `startTime`, `endTime`, `enabled`) | **CONNECTED** |
| **Scheduling — Generate** | `features/scheduling/SchedulingPage.tsx` | `schedulingApi.generate(scheduleId, req)` | `POST /api/v1/schedules/{id}/scheduling/generate` | `GenerateRequest(from, to, granularityMinutes, taskIds)` → `Plan` | **CONNECTED** |
| **Scheduling — Validate** | `features/scheduling/SchedulingPage.tsx`<br>`services/schedulingApi.ts` | `schedulingApi.validate(scheduleId, req)` | `POST /api/v1/schedules/{id}/scheduling/validate` | `SchedulingValidationRequest(planId, fingerprint, slots, scheduleVersion)` → `ValidationResponse(valid, fingerprint, errors)`. Executed before apply. | **CONNECTED** |
| **Scheduling — Apply** | `features/scheduling/SchedulingPage.tsx` | `schedulingApi.apply(scheduleId, plan)` | `POST /api/v1/schedules/{id}/scheduling/apply` | `ApplyRequest(planId, fingerprint, slots, scheduleVersion)`. Catches 409 and displays exact Vietnamese stale-plan notification. | **CONNECTED** |
| **Scheduling — Preferences** | `features/scheduling/SchedulingPage.tsx` | `schedulingApi.get/updatePreferences` | `/api/v1/schedules/{id}/scheduling/preferences` | `Preferences` DTO | **CONNECTED** |
| **Scheduling — AI Suggest** | `features/calendar/components/CalendarAiPlannerBar.tsx` | `scheduleApi.getAiRecommendation` | `GET /api/v1/schedules/{id}/scheduling/ai-recommendation` | `AiPlannerRecommendationDto` | **CONNECTED** |
| **Scheduling — Quick Slot** | `features/calendar/components/CalendarAiPlannerBar.tsx` | `scheduleApi.applyQuickSlot` | `POST /api/v1/schedules/{id}/scheduling/apply-quick-slot` | `ApplyQuickSlotRequest` → `Event` | **CONNECTED** |
| **Conflict — Realtime Check** | `features/calendar/CalendarPage.tsx` | `eventApi.checkConflict(...)` | `POST /api/v1/events/check-conflict` | Query params: `scheduleId`, `startsAt`, `endsAt`, `excludeEventId` → `ConflictCheckResponse` | **CONNECTED** |
| **Conflict — Range Analysis** | `features/calendar/components/ConflictPanel.tsx` | `conflictApi.analyze(scheduleId, from, to)` | `GET /api/v1/schedules/{id}/conflicts` | `ConflictAnalysisResponse` | **CONNECTED** |
| **User Locations — CRUD** | `features/settings/components/UserLocationsSection.tsx` | `locationApi.list/create/update/remove` | `/api/v1/locations` | `GET`, `POST`, `PUT /locations/{id}`, `DELETE /locations/{id}` | **CONNECTED** |
| **Mobility — Routing & Estimate** | `features/calendar/mobility/campusRouting.ts` | `travelApi.getTravelEstimate` | `GET /api/v1/travel/estimate` | `TravelEstimate` | **CONNECTED** |
| **Mobility — Acknowledge** | `features/calendar/mobility/campusRouting.ts` | `travelApi.acknowledgeWarning` | `POST /api/v1/mobility/acknowledge` | `AcknowledgeRequest(signature, fromEventId, toEventId)` | **CONNECTED** |
| **Mobility — Candidate Check** | `features/calendar/mobility/campusRouting.ts` | `travelApi.checkCandidateMobility` | `POST /api/v1/events/check-mobility` | `CandidateMobilityRequest` → `MobilityEvaluation` | **CONNECTED** |
| **Calendar Interop — ICS Export** | `features/settings/components/IntegrationsSection.tsx`<br>`services/icsService.ts` | `icsApi.exportIcs` | `GET /api/v1/schedules/{id}/export.ics` | Connected to backend with graceful client fallback. | **CONNECTED** |
| **Calendar Interop — ICS Import** | `features/settings/components/IntegrationsSection.tsx`<br>`services/icsService.ts` | `icsApi.previewImport`<br>`icsApi.confirmImport` | `POST /api/v1/schedules/{id}/import.ics`<br>`POST .../import.ics/confirm` | Connected to backend with graceful client fallback. | **CONNECTED** |
| **Collaboration — Members** | `features/collaboration/CollaborationPage.tsx` | `collaborationApi.members/invite/updateRole/remove` | `/api/v1/schedules/{id}/members` | Full Member Management | **CONNECTED** |
| **Collaboration — Team Avail** | `features/collaboration/CollaborationPage.tsx` | `collaborationApi.teamAvailability` | `GET /api/v1/schedules/{id}/team-availability` | `TeamAvailabilityResponse` | **CONNECTED** |
| **Collaboration — Share Link** | `features/collaboration/CollaborationPage.tsx` | `collaborationApi.shareLinks/createShareLink/revokeShareLink` | `/api/v1/schedules/{id}/share-links` | Share token generation & management | **CONNECTED** |
| **Collaboration — Public View** | `features/sharing/PublicSchedulePage.tsx` | `publicScheduleApi.get(token)` | `GET /api/v1/shared/{token}` | `PublicSchedule` | **CONNECTED** |
| **Notifications — Read & List** | `features/notifications/NotificationsPage.tsx` | `notificationApi.list/markRead/markAllRead` | `/api/v1/notifications` | Notification pagination & status updates | **CONNECTED** |
| **Rescheduling — Full Flow** | `features/rescheduling/ReschedulingPage.tsx` | `reschedulingApi.analyze/generate/apply/whatIf` | `/api/v1/schedules/{id}/rescheduling/*` & `/what-if` | Complete rescheduling engine | **CONNECTED** |
| **Pro / Subscriptions** | None | None | None | No backend endpoints exist. | **UNKNOWN**<br>*(NOT YET INTEGRATED)* |

---

## 2. INTEGRATION AUDIT RESOLUTION SUMMARY

1. **Scheduling Pipeline & Stale Plan Handling (P0) — RESOLVED:**
   - `schedulingApi.validate` updated with canonical `SchedulingValidationRequest` and `ValidationResponse`.
   - `SchedulingPage.tsx` validates the plan before triggering apply.
   - HTTP 409 Conflict triggers dedicated Vietnamese notification:
     > *"Lịch đã thay đổi. Đề xuất này không còn dựa trên phiên bản lịch mới nhất. Vui lòng tạo lại kế hoạch."*

2. **User Profile Persistence API (P1) — RESOLVED:**
   - Created `services/userApi.ts` implementing `GET /users/me` and `PATCH /users/me`.
   - Added user profile configuration form in `SettingsPage.tsx` with display name, email, timezone, and locale fields.

3. **Task ↔ Event Canonical Link & Authority (P1) — RESOLVED:**
   - Added `sourceTaskId` to `EventItem` and `EventInput`.
   - Updated `toInput` in `CalendarPage.tsx` to preserve `taskId` and `sourceTaskId`.
   - Replaced manual overwrites of `remainingDurationMinutes` with authoritative backend recalculation and task re-fetch via `taskApi.get(id)`.
   - Cleaned up event-to-task mapping in `eventMapper.ts` and `longRangeMetrics.ts`.

4. **Schedule Get By ID (P1) — RESOLVED:**
   - Added `get(id: string)` to `services/scheduleApi.ts`.

5. **Calendar ICS Interop Wiring (P2) — RESOLVED:**
   - Implemented `icsApi` in `services/icsService.ts` calling backend `/export.ics`, `/import.ics`, and `/import.ics/confirm`.
   - Connected `IntegrationsSection.tsx` to use `icsApi` with seamless client fallback.

6. **Build & Test Verification — PASS:**
   - `npx vitest run`: 23/23 test files passed (148/148 tests).
   - `tsc -b && vite build`: Completed with 0 errors.

---

## 3. HISTORICAL AUDIT GAPS (ALL RESOLVED)

1. **Scheduling Validation DTO & Flow (P0):**
   - Frontend `schedulingApi.validate` was written expecting `SchedulingRequest`, but backend `SchedulingController.validate` expects canonical `SchedulingValidationRequest(planId, fingerprint, slots, scheduleVersion)` and returns `ValidationResponse(valid, fingerprint, errors)`.
   - `SchedulingPage.tsx` currently bypasses `validate` and jumps straight from `generate` to `apply`.

2. **Schedule Version Tracking & 409 Stale-Plan Handling (P0):**
   - Backend requires `scheduleVersion` during `apply` and throws HTTP 409 Conflict if schedule version has changed since plan generation.
   - Frontend must retain the backend `scheduleVersion` from `Plan` and explicitly catch HTTP 409 to display the Vietnamese prompt:
     > *"Lịch đã thay đổi. Đề xuất này không còn dựa trên phiên bản lịch mới nhất. Vui lòng tạo lại kế hoạch."*

3. **User Profile Persistence API (P1):**
   - Backend provides `PATCH /api/v1/users/me` with `UpdateUserRequest(name, avatarUrl, timezone, locale)`.
   - Frontend currently lacks `userApi.ts` and does not provide a profile editing form in `SettingsPage.tsx`.

4. **Task ↔ Event Linkage Cleanup (P1):**
   - Frontend still contains fallback string search `tasks.find((t) => item.notes?.includes(t.id))` because `sourceTaskId` was missing historically.
   - Now that backend reliably populates `sourceTaskId` and aliases `taskId`, this should be cleaned up.

5. **Explicit Environment Mode Boundary (`VITE_API_MODE`) (P1):**
   - Currently `demoMode.ts` defaults to checking localStorage or `VITE_DEMO_MODE`.
   - We must configure `VITE_API_MODE=real` as the authoritative primary mode, keeping `VITE_API_MODE=demo` as the optional development toggle without silent fallbacks.

6. **Calendar ICS Interop Wiring (P2):**
   - Frontend has working client-side RFC 5545 generator and parser in `icsService.ts`.
   - Backend now provides server-side `/export.ics` and `/import.ics/confirm`. Both can be seamlessly connected.
