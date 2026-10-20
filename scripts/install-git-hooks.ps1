# Install repo-managed git hooks (OAuth pre-push guard). Run from repo root:
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-git-hooks.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Test-Path ".git")) {
  Write-Error "Not a git repo. cd to your Findr folder (contains .git) and run again."
}

git config core.hooksPath scripts/git-hooks

Write-Host ""
Write-Host "Installed git hooks:"
Write-Host "  core.hooksPath = scripts/git-hooks"
Write-Host ""
Write-Host "Before each push that changes Google OAuth files, test:oauth runs automatically."
Write-Host "One-time setup per machine/clone. Skip once: `$env:SKIP_OAUTH_HOOK=1; git push"
Write-Host ""
