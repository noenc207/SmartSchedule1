# SmartSchedule — Deployment Runbook & Infrastructure Guide

This guide covers deployment procedures across Native Local Development, Docker Compose Staging, and Linux Production VPS environments.

---

## 1. System Requirements & Port Matrix

### Minimum Hardware
- **CPU**: 2 vCPUs (x86_64 or ARM64)
- **RAM**: 4 GB (Recommended 8 GB for high-concurrency CP-SAT operations)
- **Disk**: 20 GB SSD storage
- **OS**: Ubuntu 22.04 LTS / Debian 12 / Windows 11 with PowerShell 7+

### Port Boundary Matrix

| Service | Port | Binding | Security Rule |
| :--- | :---: | :---: | :--- |
| **Nginx Reverse Proxy** | `80`, `443` | `0.0.0.0` (Public) | Exposed to external Internet. |
| **Spring Boot API** | `8080` | `127.0.0.1` or Internal Bridge | **DO NOT EXPOSE TO PUBLIC INTERNET**. |
| **PostgreSQL Database** | `5432` | Internal Bridge | **DO NOT EXPOSE TO PUBLIC INTERNET**. |
| **Algorithm Microservice** | `8000` | Internal Bridge | **DO NOT EXPOSE TO PUBLIC INTERNET**. |

---

## 2. Deployment Method A: 1-Click Native Windows

Ideal for local testing, frontend development, and rapid code iterations without Docker overhead.

```powershell
# In project root D:\SmartSchedul
.\run_full_project.ps1
```

**Verification Steps Executed by Script:**
1. Checks PostgreSQL service on port `5432` (starts local instance if needed).
2. Spawns Spring Boot jar (`backend/target/smartschedule-api-0.1.0-SNAPSHOT.jar`) with `prod` profile.
3. Tests `/api/v1/health` and `/api/v1/health/pool` with retry loops.
4. Spawns Vite development server on port `5173`.
5. Opens browser to `http://localhost:5173`.

**Shutdown:**
```powershell
.\stop_full_project.ps1
```

---

## 3. Deployment Method B: Docker Compose Staging

Used for staging verification and containerized smoke tests.

```bash
# 1. Copy sample environment file
cp .env.example .env

# 2. Populate secure random passwords in .env
nano .env

# 3. Build and launch all services in detached mode
docker compose -f docker-compose.prod.yml up --build -d

# 4. View container logs
docker compose -f docker-compose.prod.yml logs -f backend
```

**Health Check Verification:**
```bash
curl -i http://localhost/api/v1/health
```

---

## 4. Deployment Method C: Linux Production VPS Handoff

When deploying to a remote host (e.g. AWS EC2, DigitalOcean, Hetzner, or OVH):

### Step 1: Transfer Bundle
Ensure `staging-transfer-bundle.zip` was generated via `scripts/package_staging_bundle.ps1`.
```bash
scp staging-transfer-bundle.zip user@vps-ip:/opt/smartschedule/
```

### Step 2: Unpack on VPS
```bash
ssh user@vps-ip
cd /opt/smartschedule
unzip staging-transfer-bundle.zip -d app
cd app
chmod +x scripts/*.sh
```

### Step 3: Run Deployment Script
```bash
bash scripts/deploy_linux_staging.sh
```

---

## 5. Domain & HTTPS / SSL Configuration

1. Point your DNS `A` records (`schedule.yourdomain.com`) to the VPS Public IP.
2. Install Certbot on the host:
   ```bash
   sudo apt update && sudo apt install -y certbot python3-certbot-nginx
   ```
3. Issue Let's Encrypt Certificate:
   ```bash
   sudo certbot certonly --standalone -d schedule.yourdomain.com
   ```
4. Copy production SSL configuration template:
   ```bash
   cp deployment/nginx-production-ssl.conf.template /etc/nginx/sites-available/smartschedule.conf
   # Update domain and certificate paths
   nano /etc/nginx/sites-available/smartschedule.conf
   ln -s /etc/nginx/sites-available/smartschedule.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

---

## 6. Database Backup & Disaster Recovery

### Manual Backup
```bash
docker exec -t smartschedule-postgres pg_dump -U smartschedule smartschedule | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore from Backup
```bash
gunzip < backup_20260927_120000.sql.gz | docker exec -i smartschedule-postgres psql -U smartschedule smartschedule
```

---

## 7. Troubleshooting Common Issues

| Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| `502 Bad Gateway` on `/api/v1/*` | Spring Boot is booting or crashed. | Check `docker logs smartschedule-backend`. Verify database credentials. |
| `Connection refused: 5432` | PostgreSQL is not healthy yet. | Verify `depends_on: { postgres: { condition: service_healthy } }` in Compose. |
| Flyway checksum mismatch | An existing migration was edited. | Revert change or run `./mvnw flyway:repair` (never edit committed migrations). |
| Rate limit `429 Too Many Requests` | Exceeded 10 req/s limit. | Increase limit in Nginx `nginx.conf` (`rate=20r/s`) if necessary for load tests. |
| SPA routing returns 404 | Missing fallback route in Nginx. | Ensure `try_files $uri $uri/ /index.html;` is present in Nginx `location /`. |
