# SmartSchedule — Registration Activation Key Specification

## 1. Overview & Purpose

To prevent unsolicited signups, bot registrations, and abuse during temporary testing/production deployment, SmartSchedule enforces an **Activation Key** verification on the user registration endpoint (`POST /api/v1/auth/register`).

Only users who possess a valid activation key issued by the administration can successfully register.

---

## 2. Security Architecture

1. **Server-Side Secret**:
   - The activation key is configured exclusively via the environment variable `SMARTSCHEDULE_REGISTRATION_KEY`.
   - It is loaded securely into Spring Boot's `AuthProperties`.
   - **CRITICAL**: The key is never committed to Git, never exposed via any API endpoint, and never included in the frontend client bundle.

2. **Client-Side UX**:
   - The React registration form (`frontend/src/features/auth/AuthPages.tsx`) includes an input field for "Mã kích hoạt (Activation Key)".
   - The input uses `type="password"` by default with a show/hide toggle.
   - Browser autofill is disabled (`autoComplete="off"`).
   - If missing or empty, client-side Zod validation flags the field immediately before any network traffic is sent.

---

## 3. API Contract: `POST /api/v1/auth/register`

### Request Body
```json
{
  "displayName": "Vũ Ngọc Nhi",
  "email": "nhi.vn@fpt.edu.vn",
  "password": "StrongPassword123",
  "activationKey": "SMART-DEPLOY-2026"
}
```

### Success Response (`HTTP 200 OK`)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900,
  "user": {
    "id": "7b0d879e-4e4b-4780-b26a-9bfbf053158c",
    "email": "nhi.vn@fpt.edu.vn",
    "displayName": "Vũ Ngọc Nhi",
    "avatarUrl": null,
    "enabled": true,
    "timezone": "UTC",
    "locale": "en",
    "createdAt": "2026-09-25T05:40:00Z",
    "tier": "PRO"
  }
}
```

### Invalid Key Response (`HTTP 403 Forbidden`)
If `activationKey` does not match `SMARTSCHEDULE_REGISTRATION_KEY`:
```json
{
  "timestamp": "2026-09-25T05:41:00Z",
  "status": 403,
  "code": "INVALID_ACTIVATION_KEY",
  "message": "Mã kích hoạt không chính xác hoặc đã hết hạn.",
  "path": "/api/v1/auth/register",
  "fields": {}
}
```

### Registration Closed (`HTTP 403 Forbidden`)
If `SMARTSCHEDULE_REGISTRATION_KEY` is not set or blank on the server:
```json
{
  "timestamp": "2026-09-25T05:41:00Z",
  "status": 403,
  "code": "REGISTRATION_DISABLED",
  "message": "Hệ thống tạm thời chưa mở đăng ký.",
  "path": "/api/v1/auth/register",
  "fields": {}
}
```

---

## 4. Abuse Prevention & IP Rate Limiting

To prevent brute-forcing the activation key:
1. **Spring Boot `RateLimitingFilter`**:
   - Restricts `POST /api/v1/auth/register` to `SMARTSCHEDULE_RATE_LIMIT_REGISTER_PER_MIN` (default: 5 requests per minute per IP address).
   - If exceeded, returns `HTTP 429 Too Many Requests` with `Retry-After: 60` and code `TOO_MANY_REQUESTS`.
2. **Nginx Edge Rate Limit**:
   - `limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;`
   - Bursts above 5 are immediately dropped with `429 Too Many Requests`.

---

## 5. Key Rotation & Management

- To rotate the activation key:
  1. Update `SMARTSCHEDULE_REGISTRATION_KEY` in `.env`.
  2. Reload the backend container: `docker compose up -d --no-deps backend`.
- Existing registered users are completely unaffected by key rotation because the key is only evaluated at registration time.
