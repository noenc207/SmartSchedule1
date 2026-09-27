# Changelog

All notable changes to the SmartSchedule project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta] - 2026-09-27

### Added
- **24-Hour Calendar View & Time-of-Day Quick Filters**:
  - Full 24-hour viewport configuration (`00:00:00` - `24:00:00`) eliminating grid cutoff issues.
  - Text-only period selectors: `24 Giờ`, `Buổi sáng (06:00 - 13:00)`, `Buổi chiều (12:00 - 18:30)`, and `Buổi tối (18:00 - 24:00)`.
  - Icon-free slot labeling with localized indicators (`Sáng`, `Chiều`, `Tối`).
  - Automatic completed state indicators for past calendar events and past time boundaries.
- **1-Click Full Stack Automation**:
  - `run_full_project.ps1` & `run_full_project.bat`: Single command startup for PostgreSQL, Spring Boot (Production profile), and Vite Frontend with automated connectivity validation and health checks.
  - `stop_full_project.ps1` & `stop_full_project.bat`: Clean and graceful shutdown scripts.
- **CP-SAT Scheduling & Mobility Engine**:
  - Python/FastAPI microservice utilizing Google OR-Tools CP-SAT solver for conflict-free schedule generation.
  - Campus mobility analyzer with multi-building transit matrices, walking time estimation, and buffer calculations.
  - What-If simulation engine with delta reporting against active timetable baselines.
- **Flyway Database Migrations (V1 to V15)**:
  - V1: Core schema (users, roles, profiles, schedules).
  - V2: Tasks, events, time blocks, and category definitions.
  - V3: Optimization constraints and user preferences.
  - V4: Campus locations, buildings, and walking distance matrices.
  - V5: Plan revisions and version history.
  - V6: Recurrence rules and exception handling.
  - V7: Conflict resolution audits and decision logs.
  - V8: What-If simulation states and draft proposals.
  - V9: User onboarding status, subscription plans, and feature gating.
  - V10: Concurrency control with `@Version` optimistic locking columns.
  - V11: System health metrics and connection pool tracking.
  - V12: Production-grade indexes on user lookups, date ranges, and status fields.
  - V13: Account registration security keys and quota enforcement.
  - V14: Clean database schema consolidation and demo-account removal.
  - V15: Strict foreign key constraints and cascade rules.
- **Production Reverse Proxy & Network Hardening**:
  - Nginx staging and production configurations (`deployment/nginx-staging.conf`, `deployment/nginx-production-ssl.conf.template`).
  - Strict anti-spoofing forwarded headers (`X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`).
  - Rate limiting zones (`api_limit` at 10 r/s with burst 20).
  - Dedicated SPA routing fallback (`try_files $uri $uri/ /index.html`).
- **Comprehensive Test Suites**:
  - Playwright End-to-End test suite covering 22/22 critical user workflows.
  - Backend integration tests with Testcontainers and Spring Boot `@SpringBootTest`.
  - Python engine unit and determinism tests via pytest.
  - Native backup and restore validation scripts (`scripts/test_backup_restore.ps1`).

### Changed
- **Database & Backend Hardening**:
  - HikariCP pool sized to 25 maximum connections with a 30,000ms connection timeout and 600,000ms max lifetime.
  - Zero demo data fallback in production (`SMARTSCHEDULE_PLAN_MODE=ALL_PRO` default for public beta testers).
  - Backend and PostgreSQL container ports removed from public docker host bindings (internal bridge network only).
- **Frontend Enhancements**:
  - Modernized React 19 architecture with Tailwind CSS and Framer Motion.
  - Seamless proxying via Vite development server to Spring Boot API.
  - Production build optimized with zero secret leakage.

### Security
- Closed direct backend and PostgreSQL port exposure on external interfaces.
- Implemented invitation/registration key verification (`SMARTSCHEDULE_REGISTRATION_KEY`).
- Token-based JWT authentication with HMAC-SHA256 signature verification.
- BCrypt password hashing with work factor 12.
- CORS policy restricted to explicit allowed origins in production mode.
