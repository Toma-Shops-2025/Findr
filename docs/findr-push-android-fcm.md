# Android push notifications (FCM)

If `list-push-tokens.mjs` shows **NO ROWS** but notifications are allowed in Android Settings, the app never saved an Expo push token. On **production AAB** builds this is usually **missing Firebase (FCM)** in Expo.

## One-time Expo / Firebase setup

1. [Firebase Console](https://console.firebase.google.com) → create or open a project for Findr.
2. Add an **Android app** with package **`app.findr.mobile`** (must match `app.json`).
3. Download **`google-services.json`** (do not commit to public GitHub if the repo is public — use EAS secrets).
4. [Expo docs: FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/) — upload the **FCM V1 service account JSON** to EAS:
   - `eas credentials` → Android → production → **Google Service Account Key for FCM V1**
   - Or Expo dashboard → Project → **Credentials** → Android
5. Wire `google-services.json` into EAS builds (file in repo or `eas env:create` file secret + `googleServicesFile` in `app.config`).

## After FCM is configured

1. Run a **new production AAB** (GitHub workflow or `eas build`).
2. Install from Play internal testing.
3. Log in → **Safety** tab → **Message notifications** → **Tap to register this phone**.
4. Verify:

```powershell
cd C:\Findr\api
$env:DATABASE_URL = "..."
node ..\db\scripts\list-push-tokens.mjs mytomaai@gmail.com
```

5. Render **findr-api** must have **`EXPO_ACCESS_TOKEN`** set.

## Test delivery

- Receiver: Findr **in background** (Home button).
- Sender: normal chat message.
- Render logs: no `[findr-push] no expo push tokens` for the receiver’s user id.
