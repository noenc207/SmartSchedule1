# SmartSchedule Load & Concurrency Testing Guide

## 1. Overview

SmartSchedule uses [k6](https://k6.io/) by Grafana Labs for load, concurrency, and stress testing. The test suite validates:
- System behavior under concurrent user registration and JWT issuance.
- Multi-user isolation under high read/write traffic.
- Database connection pool behavior under saturation.
- Optimistic locking collision detection (`HTTP 409 RESOURCE_VERSION_CONFLICT`).
- Task remaining duration invariant preservation under concurrent event insertion.

---

## 2. Test Scenarios

### 2.1 Baseline Concurrency Test (`load-tests/baseline_concurrency.js`)
- **Target Audience**: Standard peak business-hour traffic.
- **Concurrency Profile**:
  - 0 to 20 Virtual Users (VUs) in 30 seconds.
  - 20 VUs sustained for 1 minute.
  - Ramp to 50 VUs in 30 seconds.
  - 50 VUs sustained for 1 minute.
  - Cool-down to 0 VUs in 30 seconds.
- **Total Duration**: 3 minutes 30 seconds.
- **Target SLAs**:
  - `http_req_duration`: $p(95) < 500\text{ms}$, $p(99) < 1000\text{ms}$.
  - `http_req_failed`: $< 1.0\%$.

### 2.2 Stress Concurrency Test (`load-tests/stress_concurrency.js`)
- **Target Audience**: Spike events, launch days, and heavy multi-tenant batch writes.
- **Concurrency Profile**:
  - 0 to 50 VUs in 30 seconds.
  - Ramp to 100 VUs in 1 minute.
  - 100 VUs sustained for 2 minutes.
  - Burst to 120 VUs for 30 seconds.
  - Cool-down in 30 seconds.
- **Total Duration**: 4 minutes 30 seconds.
- **Target SLAs**:
  - `http_req_duration`: $p(95) < 1500\text{ms}$, $p(99) < 3000\text{ms}$.
  - `stress_error_rate`: $< 5.0\%$.
  - Deliberate stale updates correctly yield `HTTP 409 Conflict`.

---

## 3. Installation & Setup

### 3.1 Installing k6
- **macOS (Homebrew)**: `brew install k6`
- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```
- **Windows (winget / choco)**:
  ```powershell
  winget install k6
  # or: choco install k6
  ```

---

## 4. Running the Tests

### 4.1 Running the Baseline Test
Ensure the backend API is running at `http://localhost:8080`:

```bash
k6 run load-tests/baseline_concurrency.js
```

Targeting a remote staging environment:
```bash
k6 run \
  -e BASE_URL="https://staging.smartschedule.example.com/api/v1" \
  -e ACTIVATION_KEY="SMART-DEPLOY-2026" \
  load-tests/baseline_concurrency.js
```

### 4.2 Running the Stress Test
```bash
k6 run \
  -e BASE_URL="http://localhost:8080/api/v1" \
  -e ACTIVATION_KEY="SMART-DEPLOY-2026" \
  load-tests/stress_concurrency.js
```

### 4.3 Monitoring Database Concurrency in Real Time
While the k6 stress test is running in one terminal, run the diagnostic utility in another:
```bash
# Continuous monitoring every 10 seconds
watch -n 10 "php tools/db_health_report.php"
```
Or on Windows PowerShell:
```powershell
while ($true) { php tools\db_health_report.php; Start-Sleep -Seconds 10; Clear-Host }
```

---

## 5. Interpreting Results & Metrics

| Metric | What It Measures | Healthy Target |
| :--- | :--- | :--- |
| `http_req_duration` | Total end-to-end request round-trip time | $p(95) < 500\text{ms}$ (baseline) |
| `http_req_failed` | Rate of non-2xx/3xx HTTP responses | $< 1\%$ |
| `version_conflicts_409` | Detected optimistic lock collisions | Matches intentional stale updates |
| `schedules_created` | Throughput of multi-tenant schedule creation | Monotonically increases |
| `events_created` | Concurrent event creation throughput | Monotonically increases |

### Troubleshooting Bottlenecks
1. **High `http_req_duration` with low CPU**:
   - Check connection pool queue latency. If requests are waiting for a connection, increase `DB_POOL_MAX_SIZE` (e.g. from 10 to 25).
2. **PostgreSQL high disk I/O**:
   - Verify `V15__production_indexing_and_concurrency.sql` has executed. Full table scans during foreign key checks saturate disk I/O.
3. **Out of Memory (OOM) Errors**:
   - Ensure JVM has `-Xmx1024m` and `-XX:+UseG1GC` configured in production Docker container.
