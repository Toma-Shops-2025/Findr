# Build Findr for Play on Windows (no paid EAS)

## Why `eas build --local` failed on your PC

Expo only supports **local** EAS Android builds on **macOS or Linux**, not native Windows:

```text
Unsupported platform, macOS or Linux is required to build apps for Android
```

You still have **free** options.

---

## Option A — GitHub Actions (recommended, $0)

Build runs on **Ubuntu** in GitHub; **`--local` does not count** against your Expo Free cloud build limit.

### One-time setup

1. Create an Expo access token: https://expo.dev/settings/access-tokens  
2. GitHub → **Toma-Shops-2025/Findr** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**  
   - Name: `EXPO_TOKEN`  
   - Value: paste the token  
3. **One time on your PC** (sets Android signing in Expo for production):

```powershell
cd C:\Findr\mobile
eas credentials -p android
```

Choose **production**, let EAS **generate** a keystore, save the backup file.

### Run a build

1. GitHub → **Actions** → **Android production AAB (EAS local)** → **Run workflow**  
2. When it finishes (~15–25 min), open the run → **Artifacts** → download **findr-production-aab**  
3. Upload the `.aab` in **Play Console** → Internal testing  

---

## Option B — WSL2 on your PC (same as Linux local)

If you use **WSL2 (Ubuntu)**:

```bash
cd /mnt/c/Findr/mobile
npm install
eas build -p android --profile production --local
```

Install Node + Java + Android SDK in WSL per Expo local build docs if prompted.

---

## Option C — Wait for Expo Free cloud reset (~Nov 1, 2026)

From **Windows** PowerShell (uses **cloud** quota, one build per month on Free):

```powershell
cd C:\Findr\mobile
eas build -p android --profile production
```

---

## Option D — Android Studio on Windows (no EAS local)

```powershell
cd C:\Findr\mobile
npx expo prebuild -p android
```

Open `mobile\android` in **Android Studio** → **Build** → **Generate signed bundle / APK** → **Android App Bundle**.

You manage the keystore yourself (or use the one from `eas credentials`).

---

## While waiting

```powershell
cd C:\Findr\mobile
npx expo start
```

Test with **Expo Go** on the S9.
