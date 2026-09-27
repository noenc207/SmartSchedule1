# SmartSchedule — Temporary Production Deployment Guide

## 1. Overview & Architecture

This document provides instructions for deploying **SmartSchedule** in a temporary testing/production environment. In this mode:
- All valid registered users automatically receive **PRO** capabilities without requiring a payment gateway.
- An **Activation Key** is required for registration to prevent public abuse.
- Edge (Nginx) and application-level (Spring Boot) **IP Rate Limiting** is enforced.
- The frontend is strictly connected to the real backend with demo fallback disabled.
- The underlying subscription/billing database architecture is preserved intact so returning to standard tier gating (`FREE` vs `PRO`) requires only a single environment variable change.

```
                              [ HTTPS / 443 / 80 ]
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │     Nginx Reverse Proxy      │
                       │   - Rate Limit: 10r/m auth   │
                       │   - SPA Static Routing       │
                       │   - Security Headers         │
                       └──────────────┬───────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │  React 19 Frontend  │               │ Spring Boot Backend │
        │  (Built SPA HTML/JS)│               │ (Port 8080)         │
        └─────────────────────┘               └──────────┬──────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │   PostgreSQL 16     │
                                              │   (Port 5432)       │
                                              └─────────────────────┘
```

---

## 2. Plan Mode: `SMARTSCHEDULE_PLAN_MODE`

To allow all testers to explore full PRO functionality without destroying our data model or seeding temporary subscriptions into the database, SmartSchedule utilizes a **Plan Service Resolution Layer**:

| Mode | Behavior | Reversibility |
|---|---|---|
| `ALL_PRO` (Default) | All authenticated users are treated as PRO for capability checks and API responses. Underlying DB tier remains clean. | **Instant**: No database rollback required. |
| `STANDARD` | Strict feature gating based on user's persistent subscription tier (`FREE` vs `PRO`). | Used when the commercial billing engine is live. |

### How It Works Under the Hood
1. `PlanService.isPro(user)` returns `true` when `planProperties.isAllPro()` is enabled.
2. `SchedulingService.optimizePro`, `whatIfPro`, and `analyzeMobilityPro` query `planService.isPro(user)` instead of raw database state.
3. User profile endpoints (`/api/v1/auth/me` and `/api/v1/users/me`) return `effectiveTier = "PRO"`.
4. When `SMARTSCHEDULE_PLAN_MODE=STANDARD` is set, all capability and tier checks automatically revert to the user's persistent database subscription tier.

---

## 3. Environment Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Configure the following variables:

```bash
# Database
POSTGRES_DB=smartschedule
POSTGRES_USER=smartschedule
POSTGRES_PASSWORD=your_secure_db_password
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/smartschedule
SPRING_DATASOURCE_USERNAME=smartschedule
SPRING_DATASOURCE_PASSWORD=your_secure_db_password

# Authentication & JWT (generate a 32-byte secret)
SMARTSCHEDULE_JWT_SECRET=c21hcnRzY2hlZHVsZS1zdXBlci1zZWNyZXQtcHJvZC1rZXktMjAyNi0zMmJ5dGVz
SMARTSCHEDULE_SECURE_COOKIE=true
SMARTSCHEDULE_CORS_ALLOWED_ORIGINS=https://your-domain.com

# Temporary Deployment Controls
SMARTSCHEDULE_PLAN_MODE=ALL_PRO
SMARTSCHEDULE_REGISTRATION_KEY=YOUR_SUPER_SECRET_ACTIVATION_KEY

# Abuse Protection / Rate Limiting
SMARTSCHEDULE_RATE_LIMIT_ENABLED=true
SMARTSCHEDULE_RATE_LIMIT_REGISTER_PER_MIN=5
SMARTSCHEDULE_RATE_LIMIT_LOGIN_PER_MIN=15
SMARTSCHEDULE_RATE_LIMIT_REFRESH_PER_MIN=30

# Frontend Build
VITE_API_BASE_URL=/api/v1
VITE_API_MODE=real
VITE_DEMO_DISABLED=true
```

---

## 4. Pre-Deployment Database Cleanup

If the deployment database was previously used for local testing or QA, purge all test/demo accounts before opening registration:

1. **Backup database**:
   ```bash
   pg_dump -U smartschedule -d smartschedule -F c -b -v -f backup_pre_cleanup.dump
   ```
2. **Execute cleanup script**:
   ```bash
   psql -U smartschedule -d smartschedule -f backend/src/main/resources/db/cleanup_demo_users.sql
   ```
3. See [docs/DEMO_USER_CLEANUP.md](file:///D:/SmartSchedul/docs/DEMO_USER_CLEANUP.md) for full instructions.

---

## 5. Deployment with Docker Compose

Build and launch the containers:

```bash
# 1. Build images with production build args
docker compose build --no-cache

# 2. Start services in background
docker compose up -d

# 3. Verify health checks
docker compose ps
```

Expected output:
```text
NAME                     IMAGE                    STATUS                    PORTS
smartschedule-postgres   postgres:16-alpine       Up (healthy)              0.0.0.0:5432->5432/tcp
smartschedule-backend    smartschedule-backend    Up (healthy)              0.0.0.0:8080->8080/tcp
smartschedule-frontend   smartschedule-frontend   Up                        0.0.0.0:80->80/tcp, 0.0.0.0:5173->80/tcp
```

---

## 6. TLS / HTTPS Reverse Proxy Setup (Production)

For external production access, place Nginx behind a TLS termination proxy or configure Certbot:

### Option A: Certbot (Let's Encrypt)
On your host server:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourdomain.com
```

### Option B: Cloudflare SSL / Front Door Proxy
Set SSL mode to **Full (Strict)**, forward traffic to port 80/443 of the host machine, and ensure `X-Forwarded-For` and `X-Forwarded-Proto` headers are preserved.

---

## 7. Verification & Smoke Testing Checklist

1. **Healthcheck**:
   ```bash
   curl -i http://localhost:8080/api/v1/health
   # Expected: HTTP 200 {"status":"UP"}
   ```
2. **Registration without Activation Key**:
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"displayName":"Tester","email":"test@fpt.edu.vn","password":"Password123","activationKey":""}'
   # Expected: HTTP 422 or HTTP 403 INVALID_ACTIVATION_KEY
   ```
3. **Registration with Invalid Key**:
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"displayName":"Tester","email":"test@fpt.edu.vn","password":"Password123","activationKey":"BAD-KEY"}'
   # Expected: HTTP 403 {"code":"INVALID_ACTIVATION_KEY","message":"Mã kích hoạt không chính xác hoặc đã hết hạn."}
   ```
4. **Registration with Valid Key**:
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"displayName":"Tester","email":"test@fpt.edu.vn","password":"Password123","activationKey":"YOUR_KEY"}'
   # Expected: HTTP 200 with JWT token and "tier":"PRO"
   ```
5. **Rate Limiting Check**:
   Send 6 consecutive register requests within 1 minute from the same IP.
   # Request 6 must receive: `HTTP 429 Too Many Requests` with header `Retry-After: 60`.

---

## 8. How to Revert to Standard Commercial Billing

When testing is complete and the real payment engine is ready:
1. In `.env`:
   ```bash
   SMARTSCHEDULE_PLAN_MODE=STANDARD
   ```
2. Restart backend:
   ```bash
   docker compose up -d --no-deps backend
   ```
3. Users will now have capabilities gated strictly by their database subscription tier.
