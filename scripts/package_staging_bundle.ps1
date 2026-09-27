# ==============================================================================
# SmartSchedule — Staging Artifact Packager (PowerShell)
# Packages only deployment-safe files into staging-transfer-bundle.zip
# Excludes development secrets, .env files, node_modules, target, dumps, reports
# ==============================================================================
param (
    [string]$OutputFile = "staging-transfer-bundle.zip"
)

$ErrorActionPreference = "Stop"

Write-Host ">>> Packaging deployment-safe staging bundle into: $OutputFile..." -ForegroundColor Cyan

$tempDir = Join-Path $env:TEMP ("smartschedul_bundle_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$includePaths = @(
    "backend",
    "frontend",
    "algorithm-engine",
    "deployment",
    "scripts",
    "load-tests",
    "docs",
    "docker-compose.prod.yml",
    "docker-compose.yml",
    "README.md",
    "VERSION",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    ".env.example"
)

$projectRoot = (Get-Item $PSScriptRoot).Parent.FullName

foreach ($item in $includePaths) {
    $sourcePath = Join-Path $projectRoot $item
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $tempDir $item
        Write-Host "  Copying $item..." -ForegroundColor Gray
        Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
    }
}

# Clean unsafe / temporary / sensitive files from the bundle
Write-Host ">>> Purging non-deployment and sensitive artifacts..." -ForegroundColor Yellow
$excludePatterns = @(
    "*.env*",
    "*.dump",
    "*.log",
    "node_modules",
    "target",
    "dist",
    "playwright-report",
    "test-results",
    ".git*"
)

foreach ($pattern in $excludePatterns) {
    Get-ChildItem -Path $tempDir -Recurse -Filter $pattern -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
}

# Create zip archive
$zipPath = Join-Path (Split-Path $PSScriptRoot -Parent) $OutputFile
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host ">>> Compressing bundle to $zipPath..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

# Cleanup temp
Remove-Item -Path $tempDir -Recurse -Force

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host ">>> Bundle created successfully: $OutputFile ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host "Transfer this archive to the Linux host via: scp $OutputFile user@remote-host:~/" -ForegroundColor Green
