# Findr — Render production checklist

Use this for **findr-api** on Render so email signup, password reset, and push work in production.

## Email sign-up

- **Do not set** `DISABLE_EMAIL_SIGNUP=true` unless you intentionally block new email accounts.
- Google sign-up continues to work either way.

## Password reset (Resend)

Set on **findr-api**:

| Variable | Example |
|----------|---------|
| `RESEND_API_KEY` | from [Resend](https://resend.com) |
| `EMAIL_FROM` | `Findr <onboarding@resend.dev>` or your verified domain |
| `PASSWORD_RESET_URL_BASE` | `https://myfindr.fun/reset-password` |

Users tap **Forgot password?** in the app; the link opens `web/reset-password/` (hosted at myfindr.fun).

If `RESEND_API_KEY` is missing, the API still returns success but **no email is sent** (check API logs for `[findr-email]`).

## Push notifications (Expo)

1. Production Android build (not Expo Go) with `expo-notifications`.
2. On **findr-api**, optional but recommended:

| Variable | Purpose |
|----------|---------|
| `EXPO_ACCESS_TOKEN` | **Server** token from Expo (not the phone push token) |

### How to get `EXPO_ACCESS_TOKEN`

This is **not** `ExponentPushToken[...]` from the phone. It is a personal access token for your **Expo account** (same account you use for EAS builds):

1. Sign in at [https://expo.dev](https://expo.dev) (the account that owns the Findr EAS project).
2. Open **Account settings** → **Access tokens**  
   Direct link shape: `https://expo.dev/accounts/<your-username>/settings/access-tokens`
3. **Create token** (e.g. name: `findr-api-push`), copy the value once.
4. In Render **findr-api** → **Environment** → add **`EXPO_ACCESS_TOKEN`** = that string → **Save**.
5. **Redeploy** findr-api (Manual Deploy) so the new env loads.

Push can work without this token in some cases; with it, Expo’s push API is more reliable in production.

3. Apply migration **015** (and all pending) on Postgres — see below.
4. After login, the app registers `POST /devices/push-token`. New chat messages trigger push via `notifyUserPush`.

## Database migrations

Migrations run **from your PC** against Render Postgres (they are **not** applied when you deploy the API).  
**PR #22** on GitHub is **not** migration 015 — the SQL file is:

`db/migrations/015_free_to_meet_safety_notices.sql`

### 1) Check what’s applied

```powershell
cd C:\Users\SexyMimi\Findr\api
$env:DATABASE_URL = "<paste Render **External** Database URL from Postgres service>"
node ..\db\scripts\migration-status.mjs
```

You want **`015_free_to_meet_safety_notices.sql`** in the **applied** list (not pending).

### 2) Apply pending (including 015)

Pull latest `main` on your PC first (so the `015_...sql` file exists), then:

```powershell
cd C:\Users\SexyMimi\Findr\api
$env:DATABASE_URL = "<same External Database URL>"
node ..\db\scripts\apply-pending-migrations.mjs
```

Look for a line: `applied 015_free_to_meet_safety_notices.sql`

Use the **External** connection string from the **Postgres** service on Render (or the same URL as `DATABASE_URL` on findr-api if it already points at that DB).

## Safety reporter closure

**Needs both:**

1. Migration **015** (`safety_notices` table) — run scripts above.
2. **API code** from GitHub **main** after merging PR #22 (or equivalent) and **redeploying findr-api** on Render.

When **distinct open reports** on someone reach **`SAFETY_AUTO_HIDE_OPEN_REPORTS`** (default **3**, env optional):

- Their profile is hidden from Nearby.
- Open reports are marked **actioned**.
- Each **reporter** gets a **Safety** tab notice (“Thanks for your report…”) and a push **“Update on your report”** (if they registered push).

To test: use three different test accounts to report the same user (or lower the threshold temporarily on Render: `SAFETY_AUTO_HIDE_OPEN_REPORTS=2`).

## Render deploy — do you “commit on Render”?

**No.** Render does not hold your git repo for migrations.

- **Code:** merge PR on GitHub → Render **auto-deploys** findr-api from `main` (or click **Manual Deploy**).
- **Env vars:** edit in dashboard → **Save** → **Redeploy** so the running service picks them up.
- **Database:** run `apply-pending-migrations.mjs` from your PC with `DATABASE_URL` (one-time per new migration file).

Your Resend vars (`RESEND_API_KEY`, `EMAIL_FROM`, `PASSWORD_RESET_URL_BASE`) look correct; after any env change, redeploy once.
