# Fix Google "Access blocked" / wrong app name (e.g. RewardLoop)

If Google shows **another app name** (not Findr) or **Error 400: invalid_request**, the **Android OAuth client** in your installed build does not match the **Findr** Google Cloud project.

## Correct setup (Findr only)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → project you use for **Findr** (not Loot Lagoon / RewardLoop).
2. **APIs & Services → Credentials**
3. **OAuth 2.0 Client IDs** you need:
   - **Web client** → used as `GOOGLE_CLIENT_ID_WEB` on Render and `googleWebClientId` in `mobile/app.json` / EAS env.
   - **Android client** → package name **`app.findr.mobile`** + **SHA-1** of your **production upload key** (from EAS credentials).
4. Render **findr-api** env:
   - `GOOGLE_CLIENT_ID_WEB=...apps.googleusercontent.com`
   - `GOOGLE_CLIENT_ID_ANDROID=...apps.googleusercontent.com` (Android type client id)

## Mobile build must use Findr IDs

In `mobile/app.json` → `extra`:

- `googleWebClientId`
- `googleAndroidClientId`

EAS production profile should set the same via `EXPO_PUBLIC_GOOGLE_*` if you override at build time.

**After changing IDs:** create a **new AAB** and reinstall. Old APKs still embed old client IDs.

## Get SHA-1 for Play / EAS

```powershell
cd C:\Users\SexyMimi\Findr\mobile
eas credentials -p android
```

Download / view the keystore fingerprint and add it to the **Android** OAuth client for `app.findr.mobile`.

## Sign-up vs sign-in

Google **sign-up and sign-in are the same** flow: first Google login creates the Findr account via `POST /auth/google`. The app should show **Continue with Google** on both Login and Create account screens.
