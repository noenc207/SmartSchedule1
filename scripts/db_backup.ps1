<#
.SYNOPSIS
    SmartSchedule Automated PostgreSQL Backup Script for Windows environments.
.DESCRIPTION
    Performs compressed logical backup using pg_dump custom format (-Fc), creates logs,
    and applies backup retention cleanup.
#>

[CmdletBinding()]
param(
    [string]$HostName = $env:POSTGRES_HOST,
    [string]$Port = $env:POSTGRES_PORT,
    [string]$Database = $env:POSTGRES_DB,
    [string]$User = $env:POSTGRES_USER,
    [string]$BackupDir = $env:BACKUP_DIR,
    [int]$RetentionDays = 7
)

# Apply defaults if empty
if (-not $HostName) { $HostName = "localhost" }
if (-not $Port) { $Port = "5432" }
if (-not $Database) { $Database = "smartschedule" }
if (-not $User) { $User = "smartschedule" }
if (-not $BackupDir) { $BackupDir = "D:\SmartSchedul\backups" }

$ErrorActionPreference = "Stop"

# Ensure output directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "${Database}_backup_${Timestamp}.dump"
$LogFile = Join-Path $BackupDir "backup_${Timestamp}.log"

Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Starting PostgreSQL Backup for $Database..." -ForegroundColor Cyan
Write-Host "Target Host : $HostName`:$Port"
Write-Host "Output File : $BackupFile"

# Locate pg_dump.exe
$pgDump = Get-Command "pg_dump.exe" -ErrorAction SilentlyContinue
if (-not $pgDump) {
    # Check standard PostgreSQL paths
    $commonPaths = @(
        "D:\Scoop\apps\postgresql\current\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe"
    )
    $found = Get-ChildItem -Path $commonPaths -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($found) {
        $pgDump = $found.FullName
    } else {
        Write-Error "pg_dump.exe not found in PATH or standard installation directories. Please install PostgreSQL tools or set PATH."
        exit 1
    }
} else {
    $pgDump = $pgDump.Source
}

$dumpArgs = @(
    "--host=$HostName",
    "--port=$Port",
    "--username=$User",
    "--dbname=$Database",
    "--format=c",
    "--blobs",
    "--verbose",
    "--file=$BackupFile"
)

try {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $pgDump $dumpArgs 2>&1 | Out-File -FilePath $LogFile -Encoding utf8
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP

    if ($exitCode -eq 0 -and (Test-Path $BackupFile)) {
        $fileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Backup completed successfully! Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Error "pg_dump failed with exit code $exitCode. See $LogFile"
        exit 2
    }
} catch {
    Write-Error "Exception during pg_dump execution: $_"
    exit 2
}

# Cleanup retention
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Pruning backups older than $RetentionDays days..." -ForegroundColor Yellow
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "${Database}_backup_*.dump" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | ForEach-Object {
    Write-Host "Removing old backup: $($_.Name)"
    Remove-Item $_.FullName -Force
}

Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Backup process completed successfully." -ForegroundColor Green
