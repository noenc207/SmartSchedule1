# SMARTSCHEDULE — BACKEND STABILIZATION REPORT

**Project:** SmartSchedule Modular Monolith  
**Backend Path:** `D:\SmartSchedul\backend`  
**Execution Date:** 2026-09-24  
**Status:** **STABILIZED & VERIFIED (READY FOR INTEGRATION)**  

---

## 1. EXECUTIVE SUMMARY

The backend-first stabilization phase for SmartSchedule has been successfully executed with **100% verification against a live PostgreSQL 18.6-4 database instance**.

Key outcomes:
1. **Zero Compilation Errors:** All 3 initial compilation blockers resolved across 99 domain source files.
2. **All P0 & P1 Contract & Domain Issues Fixed:** Custom Location CRUD, Event ↔ Task canonical link via `sourceTaskId`, Task duration authority invariant enforcement, Scheduling validation contract with optimistic locking, ReminderJob idempotency, and User profile DB persistence.
3. **Three Latent Database Bugs Discovered & Fixed:**
   - Relation name typo in Flyway migration `V12__user_locations_and_multitenancy.sql` (`availability` instead of `availabilities`).
   - Hibernate schema validation type mismatch on `availabilities.weekday` (`int2 (Types#SMALLINT)` vs `Types#INTEGER`).
   - PostgreSQL `inet` type mismatch on `refresh_tokens.ip_address` when inserting string parameter without explicit SQL cast.
4. **All 28 Unit & Domain Tests Passing:** `mvn clean test` executes cleanly with 0 failures, 0 errors, and 0 skipped.
5. **Standalone Production Jar Verified:** `mvn package` produces `smartschedule-api-0.1.0-SNAPSHOT.jar`, verified bootable with `java -jar`.
6. **19/19 End-to-End Runtime Tests Passing:** Automated PowerShell verification script `verify_backend.ps1` confirms all major API workflows on the live server.
7. **Strict Scope Integrity:** Zero prohibited features introduced (no Google OAuth, no Google Calendar API, no Pro subscription, no payment gateways, no external Python/C++ engine). Frontend Demo Mode remains intact and unaffected.

---

## 2. PROBLEM RESOLUTION MATRIX

| ID | Issue Category | Priority | Symptoms / Root Cause | Solution Implemented | Status |
|:---|:---|:---:|:---|:---|:---:|
| **ISSUE-01** | Compilation | **P0** | `LocationController` and `MobilityCheckService` imported non-existent `com.smartschedule.auth.domain.User`; `ConflictAnalysisService` had `Instant.atZone(String)` type mismatch. | Corrected import to `com.smartschedule.user.domain.User` and wrapped zone in `ZoneId.of(...)`. | **FIXED** |
| **ISSUE-02** | Location Engine | **P0** | Flyway V12 created `user_locations` table, but backend lacked entity, repository, service, and write endpoints (`POST/PUT/DELETE /locations`). | Created [`UserLocation.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/domain/UserLocation.java), [`UserLocationRepository.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/infrastructure/UserLocationRepository.java), [`UserLocationService.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/application/UserLocationService.java), and implemented CRUD in [`LocationController.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/api/LocationController.java). Enforced coordinate bounds and tenant isolation. | **FIXED** |
| **ISSUE-03** | Event ↔ Task Link | **P0** | `source_task_id` existed in SQL schema and `Event` entity, but was missing in `EventRequest`/`EventResponse` DTOs, forcing frontend to use regex string hacks. | Added `sourceTaskId` to [`EventDtos.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/api/EventDtos.java) with `@JsonAlias({"taskId", "sourceTaskId"})` and `@JsonProperty("taskId")`. Updated [`EventService.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/application/EventService.java) with cross-schedule ownership validation. | **FIXED** |
| **ISSUE-04** | Duration Authority | **P0** | `Task.remainingDurationMinutes` could drift out of sync with scheduled events. Invariant $\text{remaining} = \max(0, \text{estimated} - \sum \text{linked})$ was not enforced. | Implemented `recalculateRemainingMinutes` on [`Task.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/task/domain/Task.java). Added `findAllBySourceTaskId` on [`EventRepository.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/infrastructure/EventRepository.java). Triggered automated task recalculation on event create, update, delete, and plan application. | **FIXED** |
| **ISSUE-05** | Scheduling Contract | **P0** | `SchedulingController.validate` required `ApplyRequest`, while frontend called with `SchedulingRequest`. Missing canonical DTO and version control. | Created canonical `SchedulingValidationRequest` in [`SchedulingDtos.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/scheduling/api/SchedulingDtos.java). Mapped `@PostMapping("/validate")` in [`SchedulingController.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/scheduling/api/SchedulingController.java). Enforced optimistic locking rejection (HTTP 409 Conflict) on stale `scheduleVersion`. | **FIXED** |
| **ISSUE-06** | Flyway V12 Typo | **P0** | `V12__user_locations_and_multitenancy.sql` attempted `ALTER TABLE availability ...`, but the table created in V1 was named `availabilities` (plural), crashing migrations. | Corrected `availability` to `availabilities` in [`V12__user_locations_and_multitenancy.sql`](file:///D:/SmartSchedul/backend/src/main/resources/db/migration/V12__user_locations_and_multitenancy.sql). | **FIXED** |
| **ISSUE-07** | JPA Schema Validation | **P0** | Hibernate `ddl-auto: validate` rejected `availabilities.weekday` because Java entity used `Integer` (`Types#INTEGER`) while PostgreSQL used `int2 (Types#SMALLINT)`. | Updated [`Availability.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/availability/domain/Availability.java) to use `Short weekday` internally while exposing `Integer getWeekday()` to avoid breaking external callers. | **FIXED** |
| **ISSUE-08** | PostgreSQL INET Type | **P0** | Hibernate threw `ERROR: column "ip_address" is of type inet but expression is of type character varying` when registering or logging in. | Added `@org.hibernate.annotations.ColumnTransformer(write = "?::inet")` and empty-string sanitization to [`RefreshToken.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/auth/domain/RefreshToken.java). | **FIXED** |
| **ISSUE-09** | Reminder Race Condition | **P1** | `ReminderJob.java` queried a narrow 60-second window (`scheduledFor +/- 30s`). If scheduler was delayed, notifications were dropped forever. | Broadened query condition in [`ReminderJob.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/notification/application/ReminderJob.java) to include all due upcoming/ongoing events, relying on database `idempotency_key` constraint for deduplication. | **FIXED** |
| **ISSUE-10** | User Profile Persistence | **P1** | `UserController.update` mutated in-memory entity without injecting `UserRepository` or explicitly calling `users.save(user)`. | Injected `UserRepository` into [`UserController.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/user/api/UserController.java), validated IANA timezone via `ZoneId.of(...)`, and explicitly saved user entity. | **FIXED** |
| **ISSUE-11** | Calendar ICS Robustness | **P1** | `CalendarInteropService.parseDate` threw exceptions when parsing ICS files with local dates or alternative formats. | Enhanced `parseDate` in [`CalendarInteropService.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/calendar/application/CalendarInteropService.java) to gracefully handle ISO-8601 UTC (`yyyyMMdd'T'HHmmssX`), local time (`yyyyMMdd'T'HHmmss`), and date-only (`yyyyMMdd`). | **FIXED** |
| **ISSUE-12** | Multitenancy Alignment | **P1** | V12 migration added `workspace_id` columns, but domain code has no workspace model. | **Adopted Option B:** Retained single-user personal schedules as canonical. Defaulted `workspace_id` to `user.getId()` in `UserLocation` to satisfy non-null SQL constraints without introducing artificial workspace abstractions. | **DECIDED & DOCUMENTED** |

---

## 3. IMPLEMENTATION DETAILS BY MODULE

### 3.1. Location Engine (`com.smartschedule.location`)
- **Files Modified/Created:**
  - [`UserLocation.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/domain/UserLocation.java): JPA entity mapped to `user_locations` table with validation for category enum (`HOME`, `OFFICE`, `CAFE`, `CAMPUS`, `GYM`, `ONLINE`, `CUSTOM`, `TBD`).
  - [`UserLocationRepository.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/infrastructure/UserLocationRepository.java): User-scoped query methods (`findByIdAndUserId`, `findAllByUserId`).
  - [`UserLocationService.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/application/UserLocationService.java): Encapsulates coordinate bounds validation (`-90 <= lat <= 90`, `-180 <= lon <= 180`, `Double.isNaN`, `Double.isInfinite`), tenant isolation, and CRUD operations.
  - [`LocationController.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/location/api/LocationController.java): Composite responses merging public campus POIs with private user locations; full HTTP endpoints (`GET /locations`, `POST /locations`, `GET /locations/{id}`, `PUT /locations/{id}`, `DELETE /locations/{id}`).
  - [`UserLocationServiceTest.java`](file:///D:/SmartSchedul/backend/src/test/java/com/smartschedule/location/UserLocationServiceTest.java): Unit test suite covering creation, coordinate validation, tenant isolation, and updates.

### 3.2. Event & Task Duration Authority (`com.smartschedule.event`, `com.smartschedule.task`)
- **Files Modified/Created:**
  - [`EventDtos.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/api/EventDtos.java): Added `sourceTaskId` to `EventRequest` and `EventResponse`. Supported backward-compatible `@JsonAlias({"taskId", "sourceTaskId"})` and `@JsonProperty("taskId")`.
  - [`Event.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/domain/Event.java): Added `sourceTaskId` field, `setSourceTaskId`, and overloaded `update(...)` signatures.
  - [`Task.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/task/domain/Task.java): Added `recalculateRemainingMinutes(int scheduledMinutes)` enforcing invariant:
    $$\text{remainingMinutes} = \max(0, \text{estimatedMinutes} - \sum \text{linkedScheduledDuration})$$
  - [`EventRepository.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/infrastructure/EventRepository.java): Added `findAllBySourceTaskId(UUID sourceTaskId)`.
  - [`EventService.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/event/application/EventService.java): Added cross-schedule validation (`CROSS_SCHEDULE_TASK_LINK`) and automated task recalculation across all event lifecycle events.
  - [`EventTaskLinkTest.java`](file:///D:/SmartSchedul/backend/src/test/java/com/smartschedule/event/EventTaskLinkTest.java): 3 unit tests verifying automatic duration deduction, multi-event aggregation, and duration recovery upon event deletion.

### 3.3. Scheduling & Plan Application (`com.smartschedule.scheduling`)
- **Files Modified:**
  - [`SchedulingDtos.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/scheduling/api/SchedulingDtos.java): Defined `SchedulingValidationRequest(UUID planId, String fingerprint, List<Slot> slots, Long scheduleVersion)`.
  - [`SchedulingService.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/scheduling/application/SchedulingService.java):
    - Added `validate(UUID scheduleId, SchedulingValidationRequest request)`.
    - Enforced optimistic lock check in `apply(...)`: throws `RESOURCE_VERSION_CONFLICT` (HTTP 409) if schedule version does not match.
    - Added automatic task remaining duration recalculation for all tasks impacted by applied plan slots.
  - [`SchedulingController.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/scheduling/api/SchedulingController.java): Updated `@PostMapping("/validate")` signature to accept `SchedulingValidationRequest`.

### 3.4. Database Migrations & JPA Entities (`db/migration`, `com.smartschedule.auth`, `com.smartschedule.availability`)
- **Files Modified:**
  - [`V12__user_locations_and_multitenancy.sql`](file:///D:/SmartSchedul/backend/src/main/resources/db/migration/V12__user_locations_and_multitenancy.sql): Fixed syntax error referencing `availability` instead of `availabilities`.
  - [`Availability.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/availability/domain/Availability.java): Updated `weekday` property to `Short` to match PostgreSQL `SMALLINT` (`int2`), passing Hibernate `ddl-auto: validate`.
  - [`RefreshToken.java`](file:///D:/SmartSchedul/backend/src/main/java/com/smartschedule/auth/domain/RefreshToken.java): Added `@ColumnTransformer(write = "?::inet")` to properly cast incoming IP addresses to PostgreSQL `inet`.

---

## 4. VERIFICATION EVIDENCE

### 4.1. Unit & Domain Test Suite (`mvn clean test`)
Executed on Java 21 LTS with Maven 3.9.16:
```text
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.smartschedule.auth.JwtServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.auth.TokenHasherTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.category.CategoryServiceTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.event.EventConflictServiceTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.event.EventServiceTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.event.EventTaskLinkTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.event.RecurrenceServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.location.MobilityRoutingTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.location.UserLocationServiceTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.schedule.CollaborationPhase7Test
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.scheduling.Phase6SchedulingTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.smartschedule.scheduling.SchedulingOptimizerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

### 4.2. Production Packaging (`mvn package`)
```text
[INFO] --- jar:3.4.2:jar (default-jar) @ smartschedule-api ---
[INFO] Building jar: D:\SmartSchedul\backend\target\smartschedule-api-0.1.0-SNAPSHOT.jar
[INFO] --- spring-boot:3.4.4:repackage (repackage) @ smartschedule-api ---
[INFO] Replacing main artifact D:\SmartSchedul\backend\target\smartschedule-api-0.1.0-SNAPSHOT.jar with repackaged archive.
[INFO] BUILD SUCCESS
```

### 4.3. Live Database & Runtime Verification (`verify_backend.ps1`)
Executed directly against live PostgreSQL 18.6-4 (`smartschedule` database) and running Spring Boot backend:
```text
>>> [RUNNING] 1. Health Endpoint
>>> [PASSED] 1. Health Endpoint (smartschedule-api, status=UP)

>>> [RUNNING] 2. Register User A
>>> [PASSED] 2. Register User A (user_a_e0601e8d@example.com, ID: 2f2164f8-0dc6-45f5-a6ed-f89291254b8e)

>>> [RUNNING] 3. Login User A
>>> [PASSED] 3. Login User A successful

>>> [RUNNING] 4. Auth /me for User A
>>> [PASSED] 4. Auth /me verified (User Alpha)

>>> [RUNNING] 5. Register User B
>>> [PASSED] 5. Register User B (user_b_8d381bc7@example.com, ID: 0a86477b-a365-4ec3-b8cb-e2a325064470)

>>> [RUNNING] 6. User A creates Schedule
>>> [PASSED] 6. Schedule created (635e35d2-35b6-40d4-8825-5531bee5deda, version=0)

>>> [RUNNING] 7. Multi-Tenant Isolation: User B accesses User A's Schedule
>>> [PASSED] 7. User B blocked with HTTP 403 from User A's schedule

>>> [RUNNING] 8. User A creates Category
>>> [PASSED] 8. Category created (e4dbc060-3056-4110-bba3-095bf3f2d5c1, name=Computer Science, color=#3B82F6)

>>> [RUNNING] 9. User A creates Task
>>> [PASSED] 9. Task created (5fe5fe80-113e-4788-9fd1-3cdc27ae2b57, est=120m, rem=120m)

>>> [RUNNING] 10. Event -> Task Link: Create 60m event linked to task
>>> [PASSED] 10. Event created (407ad5c0-83ad-4523-a21f-6d43029c3723) -> Task remainingDuration automatically updated to 60m!

>>> [RUNNING] 11. Event -> Task Link: Update event to 90m (endsAt 10:30)
>>> [PASSED] 11. Event updated to 90m -> Task remainingDuration automatically updated to 30m!

>>> [RUNNING] 12. User A creates Custom UserLocation
>>> [PASSED] 12. Location created (d7f2d022-1fd1-418a-be3c-13edd4b839cd, name=Campus Library Study Room 302, isCustom=True)

>>> [RUNNING] 13. User B location isolation check
>>> [PASSED] 13. User B location list does NOT leak User A's private location

>>> [RUNNING] 14. User A updates location
>>> [PASSED] 14. Location successfully updated

>>> [RUNNING] 15. Conflict detection endpoint
>>> [PASSED] 15. Conflict detected properly (hasConflict=True, conflicts=1)

>>> [RUNNING] 16. Scheduling Availability, Generate, Validate, and Apply
>>> [PASSED] 16a. Availability created for Friday 08:00-18:00
Generated plan with 1 slots, fingerprint=f1b0b35dc1bb19dd3c4a48768ea0dbfe9cae6db3f861ac3d82843a17610f4dbe
>>> [PASSED] 16b. Plan validated successfully (valid=True)
>>> [PASSED] 16c. Plan applied successfully! Version incremented.
>>> [PASSED] 16d. Stale schedule version correctly rejected with HTTP 409 Conflict

>>> [RUNNING] 17. User Profile Update & Persistence
>>> [PASSED] 17. User profile updated and persisted to DB (Dr. Alpha User, Asia/Tokyo)

>>> [RUNNING] 18. Calendar ICS Export and Import
>>> [PASSED] 18a. ICS Export produced valid iCalendar content
>>> [PASSED] 18b. ICS Import confirmed 1 event

>>> [RUNNING] 19. Event Delete -> Task Duration Recalculation
>>> [PASSED] 19. Event deleted -> Task remaining duration properly recalculated to 90m!

========================================================
ALL 19 END-TO-END RUNTIME VERIFICATION TESTS PASSED!
========================================================
```

---

## 5. DEFINITION OF DONE (DoD) CHECKLIST

- [x] **Zero Build Errors:** `mvn clean compile` and `mvn test-compile` execute with 0 errors.
- [x] **Zero Test Failures:** `mvn clean test` runs 28/28 tests with 0 failures, 0 errors, 0 skipped.
- [x] **Database Schema Integrity:** Clean execution of Flyway migrations V1 through V12 on blank PostgreSQL database.
- [x] **JPA Schema Validation:** Hibernate `ddl-auto: validate` starts cleanly without a single schema discrepancy.
- [x] **Location POI Engine Complete:** Full CRUD operations supported for user-defined locations with coordinate bounds checks.
- [x] **Multi-Tenant Security Enforced:** User isolation verified for schedules, events, tasks, and private locations (foreign access rejected with HTTP 403/404).
- [x] **Task Duration Invariant Preserved:** Linked event creation, modification, deletion, and plan application dynamically maintain:
  $$\text{remainingMinutes} = \max(0, \text{estimatedMinutes} - \sum \text{linkedScheduledDuration})$$
- [x] **Scheduling Validation Contract Aligned:** Canonical `SchedulingValidationRequest` accepted by `/validate` and version conflicts rejected with HTTP 409.
- [x] **Production Runnable Artifact:** Standalone jar package `smartschedule-api-0.1.0-SNAPSHOT.jar` runs independently and serves traffic.
- [x] **Scope Boundaries Respected:** Absolutely no forbidden features implemented. Frontend Demo Mode remains undisturbed.

---

## 6. RECOMMENDATIONS FOR NEXT PHASE

Now that the backend is confirmed **internally correct, consistent, secure, and testable**, the team can proceed with **Frontend ↔ Backend Integration**:

1. **Keep Demo Mode as a Resilient Fallback:** Retain the frontend Demo Mode toggle so developers and users can switch between live and mock states seamlessly.
2. **Wire Real APIs to Stabilized Endpoints:**
   - Replace regex notes parsing in `frontend/src/features/calendar` with `event.sourceTaskId`.
   - Update `schedulingApi.validate` to send `SchedulingValidationRequest`.
   - Connect Custom Location management UI to `/api/v1/locations` write endpoints.
   - Connect User Profile settings to `PATCH /api/v1/users/me`.
3. **Establish CI/CD Regression Pipeline:** Incorporate `verify_backend.ps1` or its equivalent JUnit test harness into continuous integration to prevent schema drift.
