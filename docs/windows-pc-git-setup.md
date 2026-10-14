# Findr — fix your Windows PC git setup

You should have **one** git repository for Findr, not a repo in your whole user folder.

## Goal

- **Correct:** `C:\Users\SexyMimi\Findr\.git` → remote `https://github.com/Toma-Shops-2025/Findr.git`
- **Wrong:** `C:\Users\SexyMimi\.git` (accidental `git init` in your home folder)

## Step 1 — check where git thinks the repo is

In PowerShell:

```powershell
cd C:\Users\SexyMimi\Findr
git rev-parse --show-toplevel
git remote -v
```

You want:

- `show-toplevel` → `C:\Users\SexyMimi\Findr`
- `remote -v` → `origin` pointing at **Toma-Shops-2025/Findr**

## Step 2 — if home folder has a stray `.git`

**Only if** this returns `True`:

```powershell
Test-Path C:\Users\SexyMimi\.git
```

Then remove the accidental repo (does **not** delete your files):

```powershell
Remove-Item -Recurse -Force C:\Users\SexyMimi\.git
```

If you are unsure, rename instead:

```powershell
Rename-Item C:\Users\SexyMimi\.git .git-accidental-backup
```

## Step 3 — if Findr folder is not a clone

```powershell
cd C:\Users\SexyMimi
# If Findr exists but has no .git, rename old folder first:
# Rename-Item Findr Findr-old-backup
git clone https://github.com/Toma-Shops-2025/Findr.git Findr
cd Findr
git pull origin main
```

## Step 4 — daily workflow

```powershell
cd C:\Users\SexyMimi\Findr
git fetch origin
git checkout main
git pull origin main
```

Never run `git init` in `C:\Users\SexyMimi` or on your Desktop unless you are starting a **new** project folder.

## Migrations on Render (quick)

```powershell
cd C:\Users\SexyMimi\Findr\api
npm install
$env:DATABASE_URL = "<paste Render External Database URL>"
node ..\db\scripts\migration-status.mjs
node ..\db\scripts\apply-pending-migrations.mjs
```
