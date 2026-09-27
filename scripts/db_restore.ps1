<#
.SYNOPSIS
    SmartSchedule Automated PostgreSQL Restore Script for Windows environments.
.DESCRIPTION
    Restores database from a custom pg_dump archive using pg_restore.exe.
.PARAMETER BackupFile
    Path to the .dump file to restore.
.PARAMETER Force
    Skip interactive confirmation.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BackupFile,

    [string]$HostName = $env:POSTGRES_HOST,
    [string]$Port = $env:POSTGRES_PORT,
    [string]$Database = $env:POSTGRES_DB,
    [string]$User = $env:POSTGRES_USER,
    [switch]$Force
)

# Apply defaults
if (-not $HostName) { $HostName = "localhost" }
if (-not $Port) { $Port = "5432" }
if (-not $Database) { $Database = "smartschedule" }
if (-not $User) { $User = "smartschedule" }

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file '$BackupFile' does not exist."
    exit 1
}

# Locate pg_restore.exe
$pgRestore = Get-Command "pg_restore.exe" -ErrorAction SilentlyContinue
if (-not $pgRestore) {
    $commonPaths = @(
        "D:\Scoop\apps\postgresql\current\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\*\bin\pg_restore.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\pg_restore.exe"
    )
    $found = Get-ChildItem -Path $commonPaths -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($found) {
        $pgRestore = $found.FullName
    } else {
        Write-Error "pg_restore.exe not found in PATH or standard installation directories."
        exit 1
    }
} else {
    $pgRestore = $pgRestore.Source
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         SMARTSCHEDULE WINDOWS DATABASE RESTORE RUNBOOK           " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Target Host     : $HostName`:$Port"
Write-Host "Target Database : $Database"
Write-Host "Target User     : $User"
Write-Host "Backup Archive  : $BackupFile"
Write-Host "=================================================================="

if (-not $Force) {
    $confirm = Read-Host "Proceed with database overwrite and restoration? Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "Restoration aborted by user." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Restoring database schema and data..." -ForegroundColor Yellow

$restoreArgs = @(
    "--host=$HostName",
    "--port=$Port",
    "--username=$User",
    "--dbname=$Database",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--verbose",
    $BackupFile
)

try {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $pgRestore $restoreArgs 2>&1 | Out-Host
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP

    if ($exitCode -eq 0 -or $exitCode -eq 1) {
        Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Restoration successfully completed!" -ForegroundColor Green
    } else {
        Write-Error "pg_restore failed with exit code $exitCode"
        exit $exitCode
    }
} catch {
    Write-Error "Exception during pg_restore execution: $_"
    exit 2
}
