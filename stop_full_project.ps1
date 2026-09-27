# ==============================================================================
# SMARTSCHEDULE - STOP ALL SERVICES
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "  SMARTSCHEDULE - DUNG TOAN BO CAC TIEN TRINH DANG CHAY   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# 1. Stop Spring Boot (java running smartschedule-api)
Write-Host "1. Dung Backend Spring Boot..." -ForegroundColor Cyan
$javaProcs = Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" | Where-Object { $_.CommandLine -like "*smartschedule-api*" }
foreach ($p in $javaProcs) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Da dung java PID: $($p.ProcessId)" -ForegroundColor Green
}

# 2. Stop Frontend Vite (node running vite)
Write-Host "2. Dung Frontend Vite..." -ForegroundColor Cyan
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*vite*" }
foreach ($p in $nodeProcs) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Da dung node PID: $($p.ProcessId)" -ForegroundColor Green
}

# 3. Stop PostgreSQL (optional, if user wants)
Write-Host "3. Kiem tra PostgreSQL..." -ForegroundColor Cyan
$pg = Get-Process -Name postgres -ErrorAction SilentlyContinue
if ($pg) {
    Write-Host "  -> PostgreSQL van dang chay (PID: $($pg[0].Id)). De nguyen de giu du lieu." -ForegroundColor DarkGray
    Write-Host "     Neu muon tat luon ca DB, chay: Stop-Process -Name postgres -Force" -ForegroundColor DarkGray
}

Write-Host "`n>>> TAT CA DICH VU UNG DUNG DA DUOC DUNG! <<<" -ForegroundColor Green
