# SmartSchedule — Intelligent University & Personal Scheduling Platform

**From tasks and constraints to an explainable, collision-free plan.**

[![Version](https://img.shields.io/badge/version-0.1.0--beta-blue.svg)](VERSION)
[![Backend](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](backend)
[![Frontend](https://img.shields.io/badge/React-19.0-61dafb.svg)](frontend)
[![Database](https://img.shields.io/badge/PostgreSQL-16%20(Flyway%20V1--V15)-336791.svg)](backend/src/main/resources/db/migration)
[![Optimization](https://img.shields.io/badge/Google%20OR--Tools-CP--SAT-ff6f00.svg)](algorithm-engine)

---

## 1. Executive Summary

SmartSchedule is an enterprise-grade modular planning platform that reconciles university timetables, study blocks, tasks, physical campus transit constraints, and personal availability into an optimal, explainable schedule.

### Core Capabilities
- **Deterministic Constraint Engine**: Uses Google OR-Tools CP-SAT solver with hard conflict guarantees and soft-preference scoring.
- **Physical Campus Mobility Routing**: Evaluates transit feasibility between campus buildings (e.g., FPT Quy Nhon Campus blocks Alpha, Beta, Gamma) with walking velocity models and safety buffers.
- **What-If Simulation**: Dry-run schedule changes against active baselines with visual delta diffs prior to committing.
- **24-Hour Calendar Grid**: Multi-view timetable supporting full 24h schedules or text-only period toggles (Morning / Afternoon / Evening / 24H) with auto-completion indicators.
- **Zero-Demo Hardened Architecture**: Strict production mode (`ALL_PRO` feature tier) with fail-closed authentication and zero mock/demo fallbacks.

---

## 2. Architecture Overview

```text
[ Browser / Single Page App ] (Port 5173 / Port 80 via Nginx)
          │
          ├── (Static assets, SPA routing fallback)
          │
          ▼
[ Nginx Reverse Proxy ] (Anti-spoofing, Rate Limiting: 10r/s)
          │
          ├── /api/v1/*
          │
          ▼
[ Spring Boot 3.3.4 Modular API ] (Port 8080 - Internal)
    ├── Security: JWT + HttpOnly Refresh Cookie + Key Gating
    ├── Persistence: Spring Data JPA + Hibernate + HikariCP (25 max pool)
    ├── Concurrency: @Version Optimistic Locking + Isolation Level READ COMMITTED
    └── Integration Client: Feign / RestClient -> Algorithm Microservice
          │
          ├── SQL Queries (Flyway V1 - V15 Migrations)
          ▼
[ PostgreSQL 16 ] (Port 5432 - Internal Bridge)
          ▲
          │
[ Python 3.11 CP-SAT Solver ] (Port 8000 - FastAPI Microservice)
```

---

## 3. Quick Start (1-Click Run)

### Windows Local Native (Recommended for development)

To launch PostgreSQL, Spring Boot (Production profile), and Vite Frontend with a single command:

```powershell
.\run_full_project.ps1
```

Or double-click `run_full_project.bat` from Windows Explorer.

**What the script does:**
1. Verifies/Starts PostgreSQL on port `5432`.
2. Starts Spring Boot 3.3.4 production jar with Hikari connection pool on port `8080`.
3. Validates `/api/v1/health` and `/api/v1/health/pool` connectivity.
4. Starts Vite development server on port `5173`.
5. Automatically opens your default browser at `http://localhost:5173`.

**To stop all running services cleanly:**
```powershell
.\stop_full_project.ps1
```
*(Or double-click `stop_full_project.bat`).*

---

### Docker Compose (Staging / Production Preview)

Run the containerized stack:

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

> [!NOTE]
> Backend (8080) and PostgreSQL (5432) ports are intentionally NOT exposed to public host interfaces in production Compose. All traffic routes through Nginx on Port 80.

---

## 4. Key Credentials & Default Accounts

For fresh or clean environments:

| Role | Email | Password | Tier |
| :--- | :--- | :--- | :--- |
| **Public Beta Tester** | `user@smartschedul.com` | `Password123!` | `ALL_PRO` (Full Features) |
| **New Sign-ups** | *Self-registered* | *User defined* | Requires Registration Key |

> [!IMPORTANT]
> **Registration Gate Key**: New registrations require the beta invitation key:  
> `SMART-STAGE-825881097B854931` (or your configured `SMARTSCHEDULE_REGISTRATION_KEY`).

---

## 5. Environment Variables & Configuration

Copy `.env.example` to `.env` to configure your environment:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | `prod` | Spring profile (`prod` disables mock fallbacks) |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/smartschedule` | JDBC database connection string |
| `SPRING_DATASOURCE_USERNAME`| `postgres` / `smartschedule` | PostgreSQL user |
| `SPRING_DATASOURCE_PASSWORD`| `change-me-in-production` | PostgreSQL password |
| `SMARTSCHEDULE_JWT_SECRET` | *32+ character random string* | Secret key for signing JWT tokens |
| `SMARTSCHEDULE_PLAN_MODE` | `ALL_PRO` | Grants all users PRO capabilities in public beta |
| `SMARTSCHEDULE_REGISTRATION_KEY` | `SMART-STAGE-825881097B854931` | Enforces authorized beta signups |
| `ALGORITHM_ENGINE_URL` | `http://localhost:8000` | Address of CP-SAT Python solver service |

For the complete configuration reference, see [docs/ENVIRONMENT_CONFIGURATION.md](docs/ENVIRONMENT_CONFIGURATION.md).

---

## 6. Directory Structure

```text
D:\SmartSchedul/
├── algorithm-engine/          # Python 3.11 / FastAPI / Google OR-Tools CP-SAT solver
├── backend/                   # Spring Boot 3.3.4 (Java 21) REST API
│   ├── src/main/java/         # Controllers, Services, Repositories, Domain Models
│   └── src/main/resources/    # application-prod.properties, Flyway migrations (V1-V15)
├── frontend/                  # React 19 / TypeScript 5.5 / Vite 6.0 / Tailwind CSS
│   ├── src/features/          # Feature slices: calendar, dashboard, tasks, what-if
│   └── e2e/                   # Playwright End-to-End test suites
├── deployment/                # Nginx configs, systemd services, SSL templates
├── docs/                      # Engineering and architecture documentation
├── scripts/                   # Packaging, native backup/restore, staging verification
├── run_full_project.ps1       # 1-click full stack Windows launch script
└── stop_full_project.ps1      # 1-click clean termination script
```

---

## 7. Testing & Verification

### Run Automated Unit & Integration Tests
```powershell
# Backend Spring Boot test suite
cd backend
.\mvnw test

# Frontend typecheck & production build
cd ..\frontend
npm run build

# Python solver test suite
cd ..\algorithm-engine
pytest tests/
```

### Run End-to-End Playwright Tests (22 Tests)
Ensure the full stack is running (`.\run_full_project.ps1`), then:
```powershell
cd frontend
npx playwright test
```

### Run Database Backup & Restore Smoke Test
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test_backup_restore.ps1
```

---

## 8. Documentation Index

- [Developer Handoff Guide](docs/DEVELOPER_HANDOFF.md)
- [Environment Configuration Guide](docs/ENVIRONMENT_CONFIGURATION.md)
- [API Specification](docs/API.md)
- [Production Deployment Runbook](docs/DEPLOYMENT.md)
- [Security Architecture & Audit](docs/SECURITY.md)
- [CP-SAT Scheduling Engine](docs/SCHEDULING_ENGINE.md)
- [Campus Mobility Engine](docs/MOBILITY.md)
- [Error Handling & Troubleshooting](docs/ERROR_HANDLING.md)
- [Database Schema & Migrations](docs/DATABASE_ARCHITECTURE.md)
- [Concurrency & Optimistic Locking](docs/CONCURRENCY.md)
