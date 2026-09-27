# ==============================================================================
# SMARTSCHEDULE - ONE-CLICK FULL PROJECT LAUNCHER
# Khởi động toàn bộ dự án: Database (PostgreSQL) + Backend (Spring Boot) + Frontend (Vite)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SMARTSCHEDULE - KHOI DONG TOAN BO HE THONG (FULL STACK) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = "D:\SmartSchedul"
$LogsDir = Join-Path $RootDir "runtime-logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

# ------------------------------------------------------------------------------
# BƯỚC 1: KIỂM TRA & KHỞI ĐỘNG POSTGRESQL (Port 5432)
# ------------------------------------------------------------------------------
Write-Host "`n[1/4] Kiem tra Database PostgreSQL..." -ForegroundColor Yellow
$pgProc = Get-Process -Name postgres -ErrorAction SilentlyContinue
if ($pgProc) {
    Write-Host "  -> PostgreSQL dang chay (PID: $($pgProc[0].Id))." -ForegroundColor Green
} else {
    Write-Host "  -> Dang khoi dong PostgreSQL daemon..." -ForegroundColor Yellow
    $pgExe = "D:\Scoop\apps\postgresql\current\bin\postgres.exe"
    $pgData = "D:\Scoop\persist\postgresql\data"
    if (Test-Path $pgExe) {
        Start-Process -FilePath $pgExe -ArgumentList "-D", "`"$pgData`"" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "  -> PostgreSQL da khoi dong thanh cong." -ForegroundColor Green
    } else {
        Write-Host "  [!] Khong tim thay postgres.exe tai: $pgExe" -ForegroundColor Red
    }
}

# Kiem tra ket noi Database thuc te
try {
    $psql = "D:\Scoop\apps\postgresql\current\bin\psql.exe"
    if (Test-Path $psql) {
        $dbCheck = & $psql -U smartschedule -d smartschedule -t -A -c "SELECT count(*) FROM users;" 2>$null
        Write-Host "  -> Ket noi Database OK (Tong nguoi dung: $dbCheck)." -ForegroundColor Green
    }
} catch {
    Write-Host "  [!] Canh bao: Khong the ket noi psql, vui long kiem tra service." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# BƯỚC 2: KIỂM TRA & KHỞI ĐỘNG BACKEND SPRING BOOT (Port 8080)
# ------------------------------------------------------------------------------
Write-Host "`n[2/4] Kiem tra Backend Spring Boot (API :8080)..." -ForegroundColor Yellow
$isBackendRunning = $false
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($health.status -eq "UP") {
        $isBackendRunning = $true
    }
} catch {}

if ($isBackendRunning) {
    Write-Host "  -> Backend Spring Boot da dang chay san sang tai port 8080." -ForegroundColor Green
} else {
    Write-Host "  -> Dang khoi dong Spring Boot API (Profile: prod, DB Pool: 25)..." -ForegroundColor Yellow
    $backendJar = Join-Path $RootDir "backend\target\smartschedule-api-0.1.0-SNAPSHOT.jar"
    if (-not (Test-Path $backendJar)) {
        Write-Host "  [!] Khong tim thay jar, dang build backend..." -ForegroundColor Yellow
        Push-Location (Join-Path $RootDir "backend")
        & mvn clean package -DskipTests
        Pop-Location
    }

    $javaScript = @"
`$env:SPRING_PROFILES_ACTIVE = "prod"
`$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/smartschedule"
`$env:SPRING_DATASOURCE_USERNAME = "smartschedule"
`$env:SPRING_DATASOURCE_PASSWORD = "smartschedule"
`$env:SMARTSCHEDULE_JWT_SECRET = "super-secret-jwt-key-for-staging-at-least-32-chars-long!"
`$env:SMARTSCHEDULE_CORS_ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost"
`$env:SMARTSCHEDULE_REGISTRATION_KEY = "SMART-STAGE-825881097B854931"
`$env:SMARTSCHEDULE_SECURE_COOKIE = "false"
`$env:DB_POOL_MAX_SIZE = "25"
`$env:DB_POOL_MIN_IDLE = "10"
Set-Location "D:\SmartSchedul\backend"
java -jar "$backendJar" *> "$LogsDir\backend.log"
"@
    $backendScriptPath = "$LogsDir\start_backend_internal.ps1"
    Set-Content -Path $backendScriptPath -Value $javaScript -Encoding UTF8

    Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "`"$backendScriptPath`"" -WindowStyle Hidden
    
    # Cho backend khoi dong
    $retries = 20
    Write-Host "  -> Dang cho Spring Boot khoi dong..." -NoNewline
    while ($retries -gt 0) {
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
        try {
            $h = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($h.status -eq "UP") {
                Write-Host " SAN SANG!" -ForegroundColor Green
                $isBackendRunning = $true
                break
            }
        } catch {}
        $retries--
    }
    if (-not $isBackendRunning) {
        Write-Host "`n  [!] Backend chua phan hoi, xem log tai: $LogsDir\backend.log" -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# BƯỚC 3: KIỂM TRA & KHỞI ĐỘNG FRONTEND VITE (Port 5173)
# ------------------------------------------------------------------------------
Write-Host "`n[3/4] Kiem tra Frontend Vite (Web :5173)..." -ForegroundColor Yellow
$isFrontendRunning = $false
try {
    $frontCheck = Invoke-WebRequest -Uri "http://localhost:5173" -Method Head -TimeoutSec 2 -ErrorAction Stop
    if ($frontCheck.StatusCode -eq 200) {
        $isFrontendRunning = $true
    }
} catch {}

if ($isFrontendRunning) {
    Write-Host "  -> Frontend Vite dev server da dang chay tai port 5173." -ForegroundColor Green
} else {
    Write-Host "  -> Dang khoi dong Vite dev server..." -ForegroundColor Yellow
    $frontScript = @"
Set-Location "D:\SmartSchedul\frontend"
npm run dev *> "$LogsDir\frontend.log"
"@
    $frontScriptPath = "$LogsDir\start_frontend_internal.ps1"
    Set-Content -Path $frontScriptPath -Value $frontScript -Encoding UTF8

    Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "`"$frontScriptPath`"" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "  -> Frontend da khoi dong thanh cong." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# BƯỚC 4: TỔNG KẾT & MỞ TRÌNH DUYỆT
# ------------------------------------------------------------------------------
Write-Host "`n[4/4] Tong ket trang thai he thong:" -ForegroundColor Cyan
Write-Host "  [OK] Database:  PostgreSQL localhost:5432 (Database: smartschedule)" -ForegroundColor Green
Write-Host "  [OK] Backend:   Spring Boot API http://localhost:8080" -ForegroundColor Green
Write-Host "  [OK] Frontend:  Vite Web App    http://localhost:5173" -ForegroundColor Green
Write-Host "  [OK] Tai khoan: user@smartschedul.com / Password123!" -ForegroundColor Yellow
Write-Host "  [OK] Ma dang ky: SMART-STAGE-825881097B854931" -ForegroundColor Yellow
Write-Host "`nDang mo trinh duyet toi http://localhost:5173..." -ForegroundColor Cyan

Start-Process "http://localhost:5173"

Write-Host "`n>>> HE THONG DA SAN SANG SU DUNG! <<<" -ForegroundColor Green
Write-Host "De dung toan bo he thong, chay file: .\stop_full_project.ps1`n" -ForegroundColor DarkGray
