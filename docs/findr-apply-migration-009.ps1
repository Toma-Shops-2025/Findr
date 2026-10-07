# Apply migration 009 on Render Postgres from Windows.
# 1. In Render: findr-db -> Connect -> External -> Copy "External Database URL"
# 2. Run:  cd C:\Findr\docs
#         .\findr-apply-migration-009.ps1
#    Paste the full URL when prompted (postgresql://findr_db_user:...@dpg-....render.com/...)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repoRoot 'api'
$migration = Join-Path $repoRoot 'db\migrations\009_strip_sample_demo_profiles.sql'

$url = $env:DATABASE_URL
if (-not $url) {
  Write-Host ''
  Write-Host 'Paste the FULL External Database URL from Render (one line, starts with postgresql://):' -ForegroundColor Cyan
  $url = (Read-Host).Trim()
}

if (-not $url.StartsWith('postgres')) {
  Write-Error 'That does not look like a database URL. Use Connect -> External -> Copy on findr-db.'
}

$env:DATABASE_URL = $url
Set-Location $apiDir
if (-not (Test-Path 'node_modules\pg')) {
  Write-Host 'Running npm install in api\ ...'
  npm install
}

Write-Host ''
Write-Host 'Step 1: URL is set. Step 2: running Node migration script...' -ForegroundColor Yellow
node scripts\apply-migration.mjs $migration
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host 'Done. You should see "Applied migration" above.' -ForegroundColor Green
