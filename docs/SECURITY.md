# SmartSchedule — Security Architecture & Threat Model

This document outlines the security controls, data isolation boundaries, cryptographic specifications, and operational defenses implemented across SmartSchedule.

---

## 1. Authentication & Session Security

### Dual-Token Architecture
- **Access Token (JWT)**:
  - Algorithm: `HMAC-SHA256` (`HS256`).
  - Lifespan: Short-lived (15 minutes).
  - Storage: In-memory JavaScript client state (never stored in `localStorage` or `sessionStorage` to mitigate XSS exfiltration).
  - Claims: Subject (`userId`), role, issuer, issue timestamp, expiration.
- **Refresh Token**:
  - Storage: Stored exclusively as an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
  - In-database Hashing: Only the cryptographic SHA-256 hash of the refresh token is stored in PostgreSQL. Raw tokens are never persisted.
  - Rotation: Every call to `POST /api/v1/auth/refresh` revokes the old token hash and issues a fresh token pair.
  - Revocation: `POST /api/v1/auth/logout` immediately invalidates the database token record and clears the client cookie.

### Password Storage
- Passwords are hashed using **BCrypt** with an adaptive work factor of 12.
- Plaintext passwords never touch logs, database dumps, or API error payloads.

---

## 2. Multi-Tenant User Isolation & IDOR Protection

SmartSchedule enforces strict tenant isolation at both the service and database query levels:

```text
[ Incoming Request with JWT Claims: userId = "usr-123" ]
                     │
                     ▼
[ Ownership Verification Guard ]
   ├── Checks if ScheduleId "sch-999" belongs to "usr-123"
   ├── Repositories use explicit queries:
   │     SELECT t FROM Task t WHERE t.id = :id AND t.schedule.user.id = :userId
   └── Any cross-tenant access returns 404 Not Found or 403 Forbidden
```

- **Insecure Direct Object Reference (IDOR) Mitigation**:
  - IDs are combined with authenticated user context.
  - Even if an attacker guesses another user's task or event UUID, queries return empty results (`EntityNotFoundException` mapped to 404).

---

## 3. Concurrency & Collision Prevention

- **Optimistic Locking**:
  - Critical domain entities (`Schedule`, `Task`, `Event`, `TimeBlock`) declare a `@Version private Long version;` field.
  - Concurrent mutations on the same schedule trigger `OptimisticLockingFailureException`, preventing lost updates and phantom schedule collisions.

---

## 4. Network Boundary & Infrastructure Hardening

```text
       INTERNET
          │
     Port 80 / 443
          ▼
┌────────────────────────────────────────────────────────┐
│  [ Nginx Edge Container ]                              │
│   ├── SSL / TLS 1.3 Termination                        │
│   ├── Rate Limiting (10 req/s, burst 20)               │
│   ├── Sanitized Forwarded Headers:                     │
│   │     proxy_set_header X-Real-IP $remote_addr;       │
│   │     proxy_set_header X-Forwarded-For $remote_addr; │
│   └── SPA Routing Protection                           │
└─────────────────────────┬──────────────────────────────┘
                          │ Internal Bridge Network
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────────┐         ┌──────────────────────┐
│ [ Spring Boot API ]  │         │ [ Algorithm Engine ] │
│   Port 8080 (Bridge) │         │   Port 8000 (Bridge) │
└──────────┬───────────┘         └──────────────────────┘
           │ Internal Bridge
           ▼
┌──────────────────────┐
│ [ PostgreSQL 16 ]    │
│   Port 5432 (Bridge) │
└──────────────────────┘
```

- **Zero Host Exposure**: Neither PostgreSQL (5432) nor Spring Boot (8080) are bound to `0.0.0.0` in `docker-compose.prod.yml`. They are accessible solely within the private Docker bridge network.
- **Anti-Spoofing Headers**: Nginx forcibly overrides incoming `X-Forwarded-For` with the true TCP remote address `$remote_addr`, preventing IP spoofing attacks against rate limiters.

---

## 5. Abuse Prevention & Registration Gate

- **Public Beta Registration Key**:
  - To prevent automated bot account creation and server exhaustion during the beta phase, registration requires a valid key: `SMARTSCHEDULE_REGISTRATION_KEY`.
  - Registration without this key returns `400 Bad Request`.
- **Rate Limiting**:
  - Registration: Maximum 5 requests/min per IP.
  - Login: Maximum 15 attempts/min per IP.
  - Refresh: Maximum 30 requests/min per IP.

---

## 6. Fail-Closed & Zero-Demo Policy

- In `prod` profile, all fake/demo fallback providers are disabled at the Spring context level.
- If database connectivity or downstream microservices fail, endpoints fail closed with standardized RFC 7807 problem details instead of returning simulated mockup data.
