# Android push notifications (FCM)

If `list-push-tokens.mjs` shows **NO ROWS** but notifications are allowed in Android Settings, the app never saved an Expo push token. On **production AAB** builds this is usually **missing Firebase (FCM)** in Expo.

## One-time Expo / Firebase setup

1. [Firebase Console](https://console.firebase.google.com) → create or open a project for Findr.
2. Add an **Android app** with package **`app.findr.mobile`** (must match `app.json`).
3. Download **`google-services.json`**.
4. [Expo docs: FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/) — upload the **FCM V1 service account JSON** to Expo (`tomas_empire` → project **findr** → Credentials → Android).
5. Put `google-services.json` where the Android build can read it:
   - **GitHub AAB workflow (recommended):** GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** named **`GOOGLE_SERVICES_JSON`**. Paste the **entire** file (starts with `{`, ends with `}`). The workflow passes this into `eas build`; `mobile/app.config.js` writes `google-services.json` during prebuild (EAS copies only git-tracked files, so a workflow-only file on disk is not enough).
   - **Local / manual builds:** copy the file to `mobile/google-services.json` (see `mobile/google-services.json.example`). Do not commit it if the repo is public.

`app.json` sets `android.googleServicesFile` to `./google-services.json` (required for `getExpoPushTokenAsync` on production AAB).

## After FCM is configured

1. Run **Android production AAB (EAS local)** on GitHub (workflow needs `EXPO_TOKEN` and `GOOGLE_SERVICES_JSON`).
2. Install from Play internal testing.
3. Log in → **Safety** tab → **Message notifications** → **Tap to register this phone**.
4. Verify:

```powershell
cd C:\Findr\api
$env:DATABASE_URL = "..."
node ..\db\scripts\list-push-tokens.mjs mytomaai@gmail.com
```

5. Render **findr-api** must have **`EXPO_ACCESS_TOKEN`** set (Expo access token, not the Firebase JSON).

## If chat works but no notification

1. **Both phones** must have a row in the database (not just Android “notifications on”):

```powershell
node ..\db\scripts\list-push-tokens.mjs mytomaai@gmail.com
node ..\db\scripts\list-push-tokens.mjs soberdrivertaxi@gmail.com
```

2. In Render logs, right after someone sends a message, search for **`[findr-push]`**:
   - `no expo push tokens` → that **receiver** never registered; open Findr → Safety → **Message notifications** (success alert) or reinstall v61+ and log in again.
   - `EXPO_ACCESS_TOKEN is not set` → add the token on **findr-api** and redeploy.
   - `expo push ticket errors` → FCM/credentials mismatch (often wrong Expo project or invalid token — re-register on the phone).

3. Test with the receiver app **swiped away** from recents (not only Home). Some devices still deliver with Home, but full swipe rules out “app still polling” confusion.

## Test delivery

- Receiver: Findr **in background** (Home button).
- Sender: normal chat message.
- Render logs: no `[findr-push] no expo push tokens` for the receiver’s user id.
