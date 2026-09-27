# Developer Handoff

Welcome to the SmartSchedule project! This document contains comprehensive information to help you understand, build, and extend the SmartSchedule system.

## 1. Project Understanding Overview

SmartSchedule is an intelligent scheduling application built with a modern microservices-inspired architecture.

### Technology Stack
*   **Backend:** Spring Boot 3.4.4 (Java 21)
*   **Frontend:** React 19 (TypeScript 5.8, Vite 6.2)
*   **Database:** PostgreSQL 16
*   **Algorithm Engine:** Python 3.11 FastAPI with OR-Tools CP-SAT
*   **Reverse Proxy:** Nginx 1.27

### Backend Architecture
The backend is structured under `com.smartschedule`, utilizing a feature-based modular approach with the following packages:
`auth`, `availability`, `calendar`, `category`, `common`, `config`, `event`, `location`, `notification`, `plan`, `rescheduling`, `schedule`, `scheduling`, `task`, `user`.
It comprises 106 Java source files, 17 JPA entities, 17 repositories, and 15 REST controllers.

### Frontend Architecture
The frontend leverages a feature-based directory structure:
`auth`, `calendar`, `collaboration`, `dashboard`, `landing`, `notifications`, `rescheduling`, `schedules`, `scheduling`, `settings`, `sharing`, `tasks`.
Key libraries include FullCalendar, Three.js/React Three Fiber (R3F), Framer Motion, Zustand (state management), Axios (API client), Lucide React (icons), Tailwind CSS (styling), and Zod (validation).

### Database Schema
The database uses Flyway migrations (V1 through V15):
*   **Tables:** `users`, `schedules`, `tasks`, `events`, `availabilities`, `categories`, `refresh_tokens`, `schedule_members`, `share_links`, `notifications`, `activity_logs`, `user_locations`, `locations`, `campus_edges`, `mobility_acknowledgements`, `event_occurrence_exceptions`, `scheduling_preferences`.
*   **Migrations History:** V1 (Initial schema) to V15 (Production indexing).

### Staging Status
🟡 **STAGING VERIFIED WITH LIMITATIONS** — Linux Docker runtime not physically executed.

---

## 2. How to Run Locally

### 1-Click Script
For convenience, you can run the provided 1-click startup script (e.g., `start.sh` or `start.bat` located in the root directory) which initializes PostgreSQL, builds the backend, installs frontend dependencies, and starts all services.

### Manual Execution
1.  **Database:** Ensure PostgreSQL 16 is running on your machine.
2.  **Algorithm Engine:**
    *   Navigate to the Python engine directory.
    *   Install requirements: `pip install -r requirements.txt`
    *   Run FastAPI server: `uvicorn main:app --reload`
3.  **Backend:**
    *   Navigate to the backend directory.
    *   Run with Maven: `./mvnw spring-boot:run`
4.  **Frontend:**
    *   Navigate to the frontend directory.
    *   Install dependencies: `npm install`
    *   Start development server: `npm run dev`

---

## 3. How to Run Tests

*   **Backend (Java):** Run Maven tests using `./mvnw test`. This executes unit and integration tests.
*   **Frontend (Unit/Integration):** Run Vitest using `npm run test` in the frontend directory.
*   **Frontend (E2E):** Run Playwright end-to-end tests using `npx playwright test`.
*   **Algorithm Engine (Python):** Run pytest using `pytest` in the engine directory.

---

## 4. How to Deploy

### Docker Compose
Deploying the entire stack is streamlined with Docker Compose.
1.  Ensure Docker and Docker Compose are installed.
2.  Run `docker-compose up -d --build` from the root directory to spin up the PostgreSQL database, Spring Boot backend, Python algorithm engine, and frontend (served via Nginx).

### Manual VPS Deployment
1.  Provision a Linux VPS.
2.  Install PostgreSQL 16, Java 21, Python 3.11, Node.js, and Nginx.
3.  Clone the repository and set up environment variables.
4.  Build the backend JAR and deploy it as a systemd service.
5.  Deploy the Python FastAPI application using Gunicorn/Uvicorn.
6.  Build the frontend (`npm run build`) and configure Nginx to serve the static files and reverse-proxy API requests to the backend.

---

## 5. How to Modify the Scheduler

The intelligent scheduling system is decoupled into a Java orchestrator and a Python solver.

*   **Flow (generate → validate → apply):** The backend collects constraints (tasks, availability, preferences) and generates a scheduling request. It calls the Python engine, which validates the constraints and generates a schedule. The backend then applies the validated schedule to the database.
*   **Algorithm-Engine Microservice:** A Python FastAPI service that implements constraint programming using Google OR-Tools CP-SAT.
*   **AlgorithmClient.java:** The Java client responsible for making HTTP requests to the Python microservice and deserializing the schedule response.

To modify constraints or scoring, update the Python engine logic. To change what data is considered, update the Java request generation logic.

---

## 6. How to Modify the Frontend

*   **Feature-Based Structure:** Code is organized by domain features (e.g., `src/features/calendar`, `src/features/auth`). Components, hooks, and types specific to a feature reside in its directory.
*   **Stores (Zustand):** Global state is managed by Zustand stores (e.g., `useAuthStore`, `useScheduleStore`). Modify these to add new global state.
*   **API Layer (Axios):** API calls are centralized, often using custom hooks or a dedicated API client file. Ensure API functions map correctly to backend DTOs.
*   **Routes:** Defined using standard React routing. Add new pages by mapping a route path to a feature's entry component.

---

## 7. How to Add a New API Endpoint

Follow the layered architecture pattern:
1.  **DTOs:** Create Request and Response Data Transfer Objects (Records are preferred in Java 21) in the relevant feature module.
2.  **Repository:** If new data access is needed, update or create a Spring Data JPA Repository.
3.  **Service:** Implement the business logic in a `@Service` class, injecting the repository.
4.  **Controller:** Create a `@RestController` class. Map the HTTP method (e.g., `@GetMapping`, `@PostMapping`), validate the request body using `@Valid`, and call the service.

---

## 8. How to Add a Database Migration

We use Flyway for schema management.
*   **Sequential Versioning:** Name your file sequentially (e.g., if the latest is V15, the next must be `V16__Description.sql`).
*   **Immutability:** **NEVER** edit an existing, previously applied migration file. This will cause Flyway checksum validation to fail on startup.
*   **Idempotency:** Use `IF NOT EXISTS` for tables, columns, and indexes where possible to prevent errors on multiple runs.

---

## 9. How to Change the 3D Landing Scene

The 3D landing page utilizes React Three Fiber (R3F).
*   **MascotModel.tsx:** Handles the logic and rendering of the primary 3D mascot.
*   **HeroScene.tsx / ClosingScene.tsx:** Define the composition of the scene, lighting, camera angles, and animations using Framer Motion 3D.
*   **Assets:** The 3D models are GLB format, stored in `public/models/`.

---

## 10. How to Add a 3D Asset

1.  Obtain or export your 3D model in **GLB** format.
2.  Place the `.glb` file in the `public/models/` directory.
3.  In your React component, import the asset using R3F's `useGLTF` hook.
4.  Wrap the component containing the 3D asset in a React `<Suspense>` boundary to handle loading states smoothly.

---

## 11. How to Release

1.  **Build Backend:** Run `./mvnw clean package -DskipTests` to generate the executable `.jar` file.
2.  **Build Frontend:** Navigate to the frontend directory and run `npm run build` to generate the production bundle.
3.  **Package Bundle:** Archive the necessary release artifacts (JAR, frontend dist, docker-compose.yml).
4.  **Transfer:** Upload the package to the target server via SCP/SFTP.
5.  **Deploy:** Execute the deployment script or restart the Docker/systemd services to apply the new version.

---

## 12. Troubleshooting Common Issues

*   **502 Bad Gateway:** Usually means Nginx is running, but the backend Spring Boot app or Python Engine is down or not responding. Check the respective service logs.
*   **Flyway Checksum Mismatch:** Occurs if an already applied migration file was modified. Revert the file to its original state or, if on development, drop the schema and recreate it.
*   **Connection Refused:** Ensure the requested service (PostgreSQL, Backend, Engine) is actually running and listening on the expected port.
*   **Rate Limiting:** If requests are being blocked, check the Nginx rate limiting configuration or the application-level API gateway limits and adjust if necessary for testing.
