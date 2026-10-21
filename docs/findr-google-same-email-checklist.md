# Google sign-in + same email (password account)

**Goal:** Someone who already signed up with **email + password** can also tap **Continue with Google** using the **same email** — one account, not `409 email_taken`.

**Do not break:** Existing Google sign-in, email login, and new Google-only signups.

---

## What has to be true (all three)

| # | Piece | Where |
|---|--------|--------|
| 1 | API code that **links** Google to an existing email user | `main` commit **5c542d5** or later (`upsertGoogleUser` + `google_sub`) |
| 2 | Database column **`google_sub`** | Migration **`016_google_sub_link.sql`** applied on **Render Postgres** |
| 3 | Mobile app that finishes Google OAuth reliably | Production build **versionCode 58+** (PR #31) |

If **(2)** is missing, `/auth/google` can **500** or still return **409** even with correct API code.

---

## Step 1 — Update your repo (PC)

```powershell
cd C:\Findr
git checkout main
git pull origin main
git log -1 --oneline
```

Expect: `5c542d5` … **OAuth guardrails (v58) (#31)**

Safety check:

```powershell
cd C:\Findr\mobile
npm install
npm run test:oauth
```

All tests should pass.

---

## Step 2 — Confirm Render API is on latest `main`

1. [Render](https://dashboard.render.com) → **findr-api** → **Events** or **Logs**.
2. Latest deploy should be **after** PR #31 merged (same code as `5c542d5`).
3. If unsure: **Manual Deploy** → deploy latest `main`.

---

## Step 3 — Apply migration 016 (required)

1. Render → **PostgreSQL** → copy **External Database URL**.
2. PowerShell:

```powershell
cd C:\Findr\api
$env:DATABASE_URL = "paste-external-url-here"
node ..\db\scripts\apply-pending-migrations.mjs
```

3. You should see **`016_google_sub_link.sql`** applied (or “no pending” if already done).

**Check without applying:**

```powershell
node ..\db\scripts\migration-status.mjs
```

Look for **`016_google_sub_link.sql`** under **applied**.

---

## Step 4 — Ship mobile build 58 (if users are still on older builds)

Google **linking** is mostly API + DB. OAuth **stability** is in the app build.

```powershell
cd C:\Findr\mobile
eas build --platform android --profile production
```

Upload the **.aab** to Play (internal track first is fine).

---

## Step 5 — Test matrix (do all four)

Use a **test email** you control. Watch **findr-api** live logs.

| Test | Steps | Pass |
|------|--------|------|
| **A. Email login** | Create or use email/password account → log in | `POST /login` **200**, app works |
| **B. Google link** | Log out → **Continue with Google** with **same email** as A | `POST /auth/google` **200** (not **409**) |
| **C. Google again** | Force-close app → Google sign-in again | **200**, no long spinner |
| **D. Password still works** | Log out → email + password from A | **200** |

**Fail B with 409:** migration 016 not applied, or API not deployed from `main`.

**Fail B with 500:** check API logs for SQL error mentioning `google_sub` → run Step 3.

**Spinner, no `/auth/google` in logs:** mobile OAuth bug → need build **58+**, not API.

---

## Step 6 — When linking is *not* allowed (by design)

`409 email_taken` is still correct if:

- That email’s row already has a **different** `google_sub` (another Google account was linked first).

User should sign in with **email/password** or the **original** Google account.

---

## Quick commands reference

```powershell
# OAuth regression (local)
cd C:\Findr\mobile
npm run test:oauth

# Migrations (production DB)
cd C:\Findr\api
$env:DATABASE_URL = "..."
node ..\db\scripts\apply-pending-migrations.mjs
node ..\db\scripts\migration-status.mjs
```
