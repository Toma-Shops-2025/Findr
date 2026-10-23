# Android AAB releases (Play)

## Bump `versionCode` every upload

Google Play rejects an AAB if **`android.versionCode`** was already used.

Before each **Android production AAB (EAS local)** workflow run:

1. Edit `mobile/app.json`
2. Increase **`expo.android.versionCode`** by **1** (e.g. 62 → 63)
3. Optionally bump **`expo.version`** (user-visible, e.g. `0.1.9`)
4. Commit, push, then run the GitHub workflow

The workflow does **not** auto-bump; you must commit the new code.

## Required secrets

- `EXPO_TOKEN` — [Expo access token](https://expo.dev/settings/access-tokens)
- `GOOGLE_SERVICES_JSON` — full Firebase `google-services.json` for `app.findr.mobile`

## After the build

Upload the artifact to Play Console (internal testing or production track).
