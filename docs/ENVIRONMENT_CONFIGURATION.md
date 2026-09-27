# SmartSchedule — Environment Configuration Reference

This guide provides a comprehensive specification of all environment variables used across SmartSchedule tiers (Database, Backend API, Frontend, Nginx, and Algorithm Engine).

---

## 1. Summary of Variables

| Variable | Category | Type | Default / Example | Secret? | Description |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `SPRING_PROFILES_ACTIVE` | Backend | String | `prod` | No | Active Spring configuration profile (`prod` or `dev`). |
| `SERVER_PORT` | Backend | Integer | `8080` | No | HTTP port for Spring Boot API server. |
| `POSTGRES_DB` | Database | String | `smartschedule` | No | Database name in PostgreSQL. |
| `POSTGRES_USER` | Database | String | `smartschedule` | No | PostgreSQL administrative username. |
| `POSTGRES_PASSWORD` | Database | String | *Generated Secret* | **YES** | Password for PostgreSQL user. |
| `SPRING_DATASOURCE_URL` | Backend | String | `jdbc:postgresql://postgres:5432/smartschedule` | No | JDBC connection URL. |
| `SPRING_DATASOURCE_USERNAME`| Backend | String | `smartschedule` | No | Database username used by Spring Boot. |
| `SPRING_DATASOURCE_PASSWORD`| Backend | String | *Generated Secret* | **YES** | Database password used by Spring Boot. |
| `SMARTSCHEDULE_JWT_SECRET` | Backend | String | *Min 32-byte Base64* | **YES** | HMAC-SHA256 signature secret for JWT tokens. |
| `SMARTSCHEDULE_SECURE_COOKIE`| Backend | Boolean | `true` | No | Whether HttpOnly refresh cookies require `Secure` (HTTPS). Set `false` only in plain HTTP dev. |
| `SMARTSCHEDULE_CORS_ALLOWED_ORIGINS`| Backend | String | `https://your-domain.com` | No | Comma-separated list of allowed CORS origins. |
| `SMARTSCHEDULE_REGISTRATION_KEY`| Backend | String | *Secret Alpha-Num* | **YES** | Registration invitation key required to create an account. |
| `SMARTSCHEDULE_PLAN_MODE` | Backend | Enum | `ALL_PRO` | No | `ALL_PRO`: unlocks all features for beta testers; `STANDARD`: regular subscription tiering. |
| `SMARTSCHEDULE_RATE_LIMIT_ENABLED`| Backend | Boolean | `true` | No | Enables Spring-level token bucket rate limiting. |
| `SMARTSCHEDULE_RATE_LIMIT_REGISTER_PER_MIN`| Backend | Integer | `5` | No | Maximum registration requests per minute per IP. |
| `SMARTSCHEDULE_RATE_LIMIT_LOGIN_PER_MIN`| Backend | Integer | `15` | No | Maximum login attempts per minute per IP. |
| `SMARTSCHEDULE_RATE_LIMIT_REFRESH_PER_MIN`| Backend | Integer | `30` | No | Maximum refresh requests per minute per IP. |
| `SMARTSCHEDULE_REMINDER_DELAY_MS`| Backend | Long | `60000` | No | Interval (ms) for schedule reminder daemon. |
| `ALGORITHM_ENGINE_URL` | Backend | String | `http://algorithm-engine:8000` | No | Base URL of CP-SAT solver FastAPI microservice. |
| `VITE_API_BASE_URL` | Frontend | String | `/api/v1` | No | Base path for frontend API calls. |
| `VITE_API_MODE` | Frontend | String | `real` | No | `real` enforces genuine backend API calls (disables mock fallbacks). |
| `VITE_DEMO_DISABLED` | Frontend | Boolean | `true` | No | Explicitly hides demo login buttons from UI. |

---

## 2. Environment Matrix by Deployment Mode

### Development (Local Native Windows)
```ini
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/smartschedule
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=Password123!
SMARTSCHEDULE_SECURE_COOKIE=false
SMARTSCHEDULE_CORS_ALLOWED_ORIGINS=http://localhost:5173
SMARTSCHEDULE_PLAN_MODE=ALL_PRO
SMARTSCHEDULE_REGISTRATION_KEY=SMART-STAGE-825881097B854931
VITE_API_BASE_URL=/api/v1
VITE_API_MODE=real
```

### Staging & Production (Docker Compose / Linux)
```ini
SPRING_PROFILES_ACTIVE=prod
POSTGRES_DB=smartschedule
POSTGRES_USER=smartschedule
POSTGRES_PASSWORD=generate_a_secure_random_pw_here
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/smartschedule
SPRING_DATASOURCE_USERNAME=smartschedule
SPRING_DATASOURCE_PASSWORD=generate_a_secure_random_pw_here
SMARTSCHEDULE_JWT_SECRET=use_openssl_rand_base64_32_to_generate
SMARTSCHEDULE_SECURE_COOKIE=true
SMARTSCHEDULE_CORS_ALLOWED_ORIGINS=https://staging.smartschedul.com
SMARTSCHEDULE_PLAN_MODE=ALL_PRO
SMARTSCHEDULE_REGISTRATION_KEY=SMART-STAGE-825881097B854931
VITE_API_BASE_URL=/api/v1
VITE_API_MODE=real
VITE_DEMO_DISABLED=true
```

---

## 3. Secret Generation Instructions

To generate secure secrets for staging or production, use standard cryptographic tools:

```bash
# Generate 256-bit JWT Secret
openssl rand -base64 32

# Generate Secure Database Password
openssl rand -hex 24

# Generate New Registration Activation Key
openssl rand -hex 12 | tr '[:lower:]' '[:upper:]' | sed 's/^/SMART-BETA-/'
```
