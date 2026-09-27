# SmartSchedule — Error Handling & Status Code Guide

SmartSchedule adheres to RFC 7807 (Problem Details for HTTP APIs) across all services. This document provides developers with error mappings, payload schemas, and resolution workflows.

---

## 1. Problem Details Schema

All API error responses return `Content-Type: application/problem+json` with the following structure:

```json
{
  "type": "https://smartschedul.com/errors/RESOURCE_CONFLICT",
  "title": "Conflict Detected",
  "status": 409,
  "detail": "Optimistic lock error: the schedule was modified by another concurrent session.",
  "instance": "/api/v1/schedules/102",
  "timestamp": "2026-09-27T12:00:00Z"
}
```

---

## 2. HTTP Status Code Catalog

| Status Code | Error Key / Type | Cause | Client Resolution |
| :---: | :--- | :--- | :--- |
| **`400`** | `VALIDATION_FAILED` | Input payload validation failed (e.g., negative duration, invalid date format). | Correct fields according to API validation messages. |
| **`400`** | `INVALID_REGISTRATION_KEY` | Provided registration activation key is missing or incorrect. | Provide the authorized beta registration key. |
| **`401`** | `UNAUTHORIZED` | Access token missing, invalid, or expired. | Refresh token via `POST /api/v1/auth/refresh` or re-login. |
| **`403`** | `FORBIDDEN` | Authenticated user lacks permission to access the resource. | Check entity ownership or user roles. |
| **`404`** | `RESOURCE_NOT_FOUND` | Entity ID does not exist or belongs to a different user (IDOR protection). | Verify entity ID or ensure user owns the target entity. |
| **`409`** | `OPTIMISTIC_LOCK_FAILURE` | Entity version mismatch during concurrent save. | Re-fetch the latest state and retry the operation. |
| **`409`** | `EVENT_COLLISION` | Fixed event overlaps with an existing fixed event on the same calendar. | Adjust event time boundaries. |
| **`422`** | `UNSOLVABLE_CONSTRAINTS` | CP-SAT solver proved that task cannot fit within availability and deadlines. | Extend task deadline or increase user availability window. |
| **`429`** | `RATE_LIMIT_EXCEEDED` | Request frequency exceeded configured threshold (e.g., >10 req/s on Nginx). | Implement client-side exponential backoff. |
| **`500`** | `INTERNAL_SERVER_ERROR` | Unexpected backend runtime failure. | Inspect `runtime-logs/` or container logs for root trace. |
| **`502`** | `BAD_GATEWAY` | Nginx cannot connect to Spring Boot or Spring cannot reach CP-SAT solver. | Verify container health and port bindings. |
| **`503`** | `SERVICE_UNAVAILABLE` | Database connection pool exhausted or database undergoing maintenance. | Inspect HikariCP pool status at `/api/v1/health/pool`. |

---

## 3. Frontend Error Recovery Flow

```text
[ Client Request ]
       │
       ▼
[ Axios Response Interceptor ]
       │
   Is 401 Unauthorized?
   ├── YES ──► Invoke POST /api/v1/auth/refresh (Cookie)
   │               │
   │               ├── Succeeded? ──► Replay original request with new token.
   │               └── Failed?    ──► Clear session state & redirect to /login.
   │
   Is 409 Conflict?
   ├── YES ──► Prompt user: "Data changed remotely. Reload latest version?"
   │
   Is 429 Rate Limited?
   └── YES ──► Show toast: "Too many requests. Please wait a few seconds."
```
