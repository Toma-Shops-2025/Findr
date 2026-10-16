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
| `EXPO_ACCESS_TOKEN` | Expo account token for reliable push delivery |

3. Apply migration **015** (and all pending) on Postgres.
4. After login, the app registers `POST /devices/push-token`. New chat messages trigger push via `notifyUserPush`.

## Database migrations

```powershell
cd api
$env:DATABASE_URL = "<Render external URL>"
node ..\db\scripts\apply-pending-migrations.mjs
```

Migration **015** adds **Free to meet** and **safety reporter notices**.

## Safety reporter closure

When open reports reach `SAFETY_AUTO_HIDE_OPEN_REPORTS` (default 3), reporters get an in-app notice under **Safety** and a push titled **Update on your report**.
