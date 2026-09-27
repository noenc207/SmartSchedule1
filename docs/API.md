# SmartSchedule — REST API Catalog & Specification

Base Path: `/api/v1`  
Authentication: Bearer Token (`Authorization: Bearer <token>`) or HttpOnly Refresh Cookie (`POST /auth/refresh`).

---

## 1. System Health & Pool Metrics (`HealthController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | Public | System status, database ping, uptime. |
| `GET` | `/health/pool` | Public | Hikari connection pool metrics (active, idle, waiting). |

**Sample Response (`GET /api/v1/health`):**
```json
{
  "status": "UP",
  "database": "UP",
  "timestamp": "2026-09-27T12:00:00Z",
  "version": "0.1.0-beta"
}
```

---

## 2. Authentication & Account Management (`AuthController`, `UserController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | Public | Register new user. Requires `registrationKey`. |
| `POST` | `/auth/login` | Public | Authenticate user, return JWT and set HttpOnly refresh cookie. |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh token and issue new access token. |
| `POST` | `/auth/logout` | User | Invalidate refresh token session and clear cookie. |
| `GET` | `/auth/me` | User | Retrieve current user profile and subscription tier. |
| `PUT` | `/users/profile` | User | Update user profile, full name, or campus preferences. |

---

## 3. Schedules & Timetables (`ScheduleController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/schedules` | User | List all schedules owned by authenticated user. |
| `POST` | `/schedules` | User | Create a new schedule container. |
| `GET` | `/schedules/{id}` | User | Get single schedule details. |
| `PUT` | `/schedules/{id}` | User | Update schedule name, description, or active status. |
| `DELETE` | `/schedules/{id}` | User | Delete schedule and cascade child entities. |

---

## 4. Calendar Events (`EventController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/schedules/{scheduleId}/events` | User | List events in schedule (supports `from` and `to` ISO filters). |
| `POST` | `/schedules/{scheduleId}/events` | User | Create fixed event (class, exam, lecture). |
| `GET` | `/events/{id}` | User | Retrieve event by ID. |
| `PUT` | `/events/{id}` | User | Update event details, time range, or location. |
| `DELETE`| `/events/{id}` | User | Delete event. |
| `POST` | `/events/{id}/duplicate` | User | Clone event to another date. |
| `POST` | `/events/check-conflict` | User | Test if a proposed time block collides with existing events. |

---

## 5. Tasks & Study Blocks (`TaskController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/schedules/{scheduleId}/tasks` | User | List tasks with filters (`status`, `priority`, `page`, `size`). |
| `POST` | `/schedules/{scheduleId}/tasks` | User | Create task with deadline, estimated duration, and priority. |
| `GET` | `/tasks/{id}` | User | Get task by ID. |
| `PUT` | `/tasks/{id}` | User | Update task attributes, completion status, or deadline. |
| `DELETE`| `/tasks/{id}` | User | Delete task. |

---

## 6. Optimization & Smart Plan (`SchedulingController`, `ReschedulingController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/schedules/{scheduleId}/smart-plan` | User | Trigger CP-SAT solver optimization to generate optimal study plan. |
| `GET` | `/schedules/{scheduleId}/smart-plan/status` | User | Poll status of background optimization job. |
| `POST` | `/schedules/{scheduleId}/what-if` | User | Simulate impact of adding/moving events without committing. |
| `POST` | `/schedules/{scheduleId}/reschedule` | User | Dynamically reschedule uncompleted tasks around missed blocks. |

---

## 7. Campus Mobility & Transit (`LocationController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/locations` | User | List supported campus buildings and nodes. |
| `POST` | `/locations/transit-time` | User | Calculate transit duration, walking buffer, and feasibility between 2 buildings. |
| `GET` | `/locations/matrix` | User | Full walking distance and duration matrix for current campus. |

---

## 8. Availability & Categories (`AvailabilityController`, `CategoryController`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/schedules/{scheduleId}/availability` | User | Get weekly recurring availability windows. |
| `POST` | `/schedules/{scheduleId}/availability` | User | Define preferred working/studying hours. |
| `GET` | `/categories` | User | List task/event categories with hex color codes. |
| `POST` | `/categories` | User | Create custom category. |

---

## 9. Error Codes & Response Format

All error responses adhere to RFC 7807 Problem Details:

```json
{
  "type": "https://smartschedul.com/errors/conflict",
  "title": "Scheduling Conflict Detected",
  "status": 409,
  "detail": "Event 'Physics Lab' overlaps with 'Math Lecture' at 08:30-10:00",
  "instance": "/api/v1/events/check-conflict",
  "timestamp": "2026-09-27T12:00:00Z"
}
```
