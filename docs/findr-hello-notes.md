# Findr Stage 2e — Hello attention + Stay signed in (versionCode 19)

## What shipped

### Hello attention
- **API:** `POST /chat/hello-attention` with `{ "peerUserId": "<uuid>" }`.
- Opens (or reuses) the 1:1 thread and sends a first **Hello** message when the thread is empty.
- **Rate limit:** one hello per sender/recipient per UTC day (Postgres table `hello_attentions` after migration `008`; in-memory store enforces the same rule without SQL).
- **Mobile:** peer profile shows **Say Hello** (teal outline) next to **Message** (coral).

### Stay signed in
- Login screen checkbox **Stay signed in** — **default ON**.
- When OFF, JWT stays in memory for the current app session only (SecureStore cleared on login); reopening the app returns to login.
- When ON, behavior matches prior remember-me (SecureStore + cold-start restore in `app/index.tsx`).

### Build flags
- `mobile/app.json`: `versionCode` **19**, `newArchEnabled` **false** (unchanged).

## Database

Apply on Render Postgres (or local) **after** migrations 001–007:

```text
db/migrations/008_hello_attention.sql
```

From repo root with `DATABASE_URL` set and `pg` installed (API folder has the dependency):

```powershell
cd C:\Findr\api
$env:DATABASE_URL = "<your-render-postgres-url>"
node ..\db\scripts\apply-migration.mjs ..\db\migrations\008_hello_attention.sql
```

## Windows dual-folder workflow

Toma keeps **git** at `C:\Findr` and runs **EAS / Metro** from `C:\F\mobile` (short path).

`git pull` only works if `C:\Findr` is a **clone** (folder contains `.git`). If you only copied `mobile` into `C:\F`, or copied the project without `.git`, use a one-time clone:

```powershell
# Only if C:\Findr is NOT a repo (fatal: not a git repository)
Rename-Item C:\Findr C:\Findr-backup -ErrorAction SilentlyContinue
git clone https://github.com/Toma-Shops-2025/Findr.git C:\Findr
cd C:\Findr
git checkout cursor/hello-attention-stay-signed-in-v19-80cc
# after PR #2 is merged: git checkout main && git pull
```

After `C:\Findr` is a real repo:

1. `C:\Findr` — `git pull` (on `main` or the feature branch above).
2. Copy `C:\Findr\mobile` → `C:\F\mobile` (overwrite).
3. Run migration **008** (command above) against production Postgres.
4. **Render:** deploy **findr-api** service from `main` (or merge PR first).
5. **EAS preview APK:** from `C:\F\mobile`:

```powershell
cd C:\F\mobile
npm install
eas build -p android --profile preview
```

See `docs/findr-apply-hello-v19.ps1` for a single paste block.

## QA checklist

- Login: **Stay signed in** visible and checked by default; toggle OFF, log in, force-stop app → should land on login again.
- Stay signed in ON → reopen app → still on Nearby.
- Open a peer from Nearby → **Say Hello** → chat opens with **Hello** sent; appears in Chats list.
- Second hello same person same day → 429 / friendly alert; **Message** still opens thread.
