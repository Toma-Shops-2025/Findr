# Findr — budget infrastructure setup

Near-zero monthly cost: **Cloudflare R2** (photos), **Resend** (email), **Render** (API/DB/web).

## 1. Durable photos (Cloudflare R2)

1. Cloudflare dashboard → **R2** → Create bucket (e.g. `findr-media`).
2. **Public access** → allow custom domain or use `r2.dev` public URL for the bucket.
3. **API tokens** → R2 read/write token.
4. On **Render → findr-api → Environment**:

| Variable | Example |
|----------|---------|
| `S3_BUCKET` | `findr-media` |
| `S3_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_ACCESS_KEY_ID` | R2 access key |
| `S3_SECRET_ACCESS_KEY` | R2 secret |
| `S3_PUBLIC_BASE_URL` | `https://pub-xxxx.r2.dev` (your public bucket URL, no trailing slash) |

Redeploy API. New uploads return `https://...` URLs. Old `/uploads/...` URLs still work until disk is wiped.

## 2. Email (Resend)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Password reset + child-safety alerts |
| `EMAIL_FROM` | `Findr <onboarding@resend.dev>` until domain verified |
| `SAFETY_ALERT_TO` | `contactus@myfindr.fun` |
| `PASSWORD_RESET_URL_BASE` | `https://myfindr.fun/reset-password` |

## 3. Admin (reports queue)

**Never commit passwords.** On your PC:

```powershell
cd C:\Findr\api
node scripts\hash-admin-password.mjs "YOUR-STRONG-PASSWORD"
```

Set on Render:

- `ADMIN_EMAIL` = `founder@myfindr.fun`
- `ADMIN_PASSWORD_BCRYPT` = output hash

Open **https://api.myfindr.fun/admin/** after deploy.

## 4. Google Sign-In

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs → **Google+ / Google Identity** → OAuth client:
   - **Web client** → copy Client ID → `GOOGLE_CLIENT_ID_WEB` on API and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` for mobile/EAS.
   - **Android client** → package `app.findr.mobile` + SHA-1 from EAS credentials → `GOOGLE_CLIENT_ID_ANDROID` on API.
2. Apply migration **010** on Postgres.
3. Rebuild Android AAB after mobile env is set.

## 5. Migrations

```powershell
cd C:\Findr\api
$env:DATABASE_URL = "<Render external URL>"
node scripts\apply-migration.mjs ..\db\migrations\010_auth_reset_oauth.sql
```
