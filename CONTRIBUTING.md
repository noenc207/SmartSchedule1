# Contributing to SmartSchedule

Thank you for your interest in contributing to SmartSchedule! This document provides guidelines for setting up your development environment, creating pull requests, adhering to architectural standards, and maintaining database migrations.

---

## 1. Branching Strategy

We follow a modified Git Flow model:

- `main`: Production-ready code. Only merged via pull requests after staging sign-off.
- `staging`: Integration branch for pre-production deployments and testing.
- `feature/<name>`: New feature work branched off `main` or `staging`.
- `fix/<name>`: Bug fixes and security patches.
- `chore/<name>`: Maintenance, documentation, and dependencies updates.

---

## 2. Commit Message Standards

Please adhere to [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**
- `feat`: A new user-facing or API feature.
- `fix`: A bug fix.
- `docs`: Documentation updates only.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `perf`: Performance improvements.
- `test`: Adding or correcting tests.
- `chore`: Build process, package updates, or repo tooling.

---

## 3. Flyway Migration Rules (Strict)

Database changes MUST be made using Flyway SQL migrations:

1. **Immutability**: Never modify or delete any existing migration script (`V1__...` through `V15__...`). Once committed, migrations are considered permanent.
2. **Sequential Versioning**: Always use the next contiguous integer: `V16__<descriptive_snake_case_title>.sql`.
3. **Idempotence & Safety**:
   - Use `IF NOT EXISTS` when adding tables, columns, or indexes where applicable.
   - Do NOT run destructive `DROP COLUMN` or `DROP TABLE` operations without two-phase deployment and staging verification.
   - Specify explicit `NOT NULL` constraints only with valid `DEFAULT` values for backwards compatibility.
4. **Local Verification**:
   - Run `./mvnw flyway:info` and `./mvnw flyway:migrate` to verify clean application against a local PostgreSQL instance.

---

## 4. Coding Standards

### Backend (Java / Spring Boot)
- **Java Version**: JDK 21.
- **Formatting**: Adhere to standard Java conventions (4 spaces indentation).
- **Architecture**: Strict multi-tier separation:
  - `Controller`: Request validation, authentication mapping, HTTP status codes.
  - `Service`: Business logic, transactional boundaries (`@Transactional`).
  - `Repository`: Spring Data JPA queries, explicit indexed fields.
- **Concurrency**: Use `@Version` optimistic locking for entity state updates. Do not bypass concurrency tokens.

### Frontend (React / TypeScript)
- **Language**: TypeScript in strict mode. Avoid `any`; use strongly-typed DTOs.
- **Styling**: Tailwind CSS utility classes and centralized CSS variables.
- **Components**: Functional components with React hooks.
- **Icons**: Text-only or Lucide React icons where design calls for it. Do not introduce unvetted third-party icon fonts.

### Algorithm Engine (Python / FastAPI)
- **Python Version**: 3.11+.
- **Formatting**: PEP 8 compliance.
- **Solver**: OR-Tools CP-SAT models must define explicit timeouts and deterministic random seeds.

---

## 5. Testing Requirements Before PR Submission

Every proposed pull request must pass all local verification checks:

```powershell
# 1. Backend tests
cd backend
./mvnw clean test

# 2. Frontend build & typecheck
cd ../frontend
npm run build

# 3. Algorithm engine tests
cd ../algorithm-engine
pytest tests/
```

For major releases or UI modifications, run the Playwright end-to-end suite against the live stack:
```powershell
cd frontend
npx playwright test
```

---

## 6. Security & Secret Protection

- **NEVER commit secrets**: No `.env` files, private keys, database dumps, passwords, or production tokens may ever be added to git.
- Audit `.gitignore` before submitting changes.
- Always use environment variables for sensitive configuration options.
