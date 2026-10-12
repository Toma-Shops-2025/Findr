# Play Console — Android release warnings (Findr)

After uploading an AAB, **Test and release → For your next release** may show:

## 1. DEX / obfuscation below threshold

**Fix (in repo):** `expo-build-properties` with:

- `enableProguardInReleaseBuilds: true`
- `enableShrinkResourcesInReleaseBuilds: true`
- `extraProguardRules` for React Native / Expo

Rebuild production AAB and upload a **new versionCode**. Re-check the bundle report after processing (can take a few hours).

Deadline shown in Play is often **Feb 2027** — still fix early on closed testing.

## 2. Deprecated edge-to-edge APIs (Android 15)

**Fix:** `android.edgeToEdgeEnabled: true` in `app.json` (Expo SDK 57+). Keep `expo-status-bar` and safe-area context updated.

If a warning remains after a new AAB, it is usually from a dependency — upgrade Expo SDK when a patch ships.

## 3. Orientation / large screens (Android 16)

**Fix:** Removed manifest-level `orientation: "portrait"` so foldables/tablets are not hard-locked. Phones still use **portrait lock in app code** (`expo-screen-orientation` in root layout).

Upload a new AAB and confirm the warning clears on the next release report.

## Rebuild

GitHub Actions → **Android production AAB (EAS local)** on `main` → upload to closed testing → bump **versionCode** each time.
