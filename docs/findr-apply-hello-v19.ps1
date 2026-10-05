# Findr v19 — pull, sync C:\F\mobile, migration 008, deploy hints
# Run in PowerShell (one block). Edit $DatabaseUrl before running migration.

$ErrorActionPreference = "Stop"

$RepoRoot = "C:\Findr"
$MobileShort = "C:\F\mobile"

Write-Host "==> git pull in $RepoRoot"
if (-not (Test-Path "$RepoRoot\.git")) {
  Write-Host ""
  Write-Host "ERROR: $RepoRoot is not a git clone (no .git folder)."
  Write-Host "C:\F\mobile alone is not enough — clone the full repo once, then pull."
  Write-Host ""
  Write-Host "If $RepoRoot is only copied files, rename it, then clone:"
  Write-Host "  Rename-Item $RepoRoot C:\Findr-backup"
  Write-Host "  git clone https://github.com/Toma-Shops-2025/Findr.git $RepoRoot"
  Write-Host "  cd $RepoRoot"
  Write-Host "  git checkout cursor/hello-attention-stay-signed-in-v19-80cc   # or main after PR merge"
  Write-Host ""
  exit 1
}
Set-Location $RepoRoot
git pull

Write-Host "==> copy mobile -> $MobileShort"
if (-not (Test-Path $MobileShort)) {
  New-Item -ItemType Directory -Path $MobileShort -Force | Out-Null
}
robocopy "$RepoRoot\mobile" $MobileShort /MIR /XD node_modules .expo /NFL /NDL /NJH /NJS /nc /ns /np
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit $LASTEXITCODE" }

# --- Migration 008 (Render Postgres) ---
# Paste your Render external DATABASE_URL below, then uncomment:
# $DatabaseUrl = "postgres://..."
# $env:DATABASE_URL = $DatabaseUrl
# Set-Location "$RepoRoot\api"
# if (-not (Test-Path "node_modules")) { npm install }
# node ..\db\scripts\apply-migration.mjs ..\db\migrations\008_hello_attention.sql

Write-Host ""
Write-Host "==> Next steps (manual):"
Write-Host "  1. Set `$DatabaseUrl and run the migration block above (node + pg)."
Write-Host "  2. Render dashboard: deploy findr-api from merged main."
Write-Host "  3. EAS preview build:"
Write-Host "       cd $MobileShort"
Write-Host "       npm install"
Write-Host "       eas build -p android --profile preview"
Write-Host ""
Write-Host "versionCode 19 | newArchEnabled false | Stay signed in default ON on login"
