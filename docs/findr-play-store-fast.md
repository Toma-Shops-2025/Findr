# Findr → Google Play (fastest path)

You hit **EAS Free** Android build limit. To ship **without waiting ~24 days**, use **EAS Starter** (or build locally — slower setup). Play Store wants an **AAB**, not a preview APK.

## Before you build (15 min, do once)

1. **Merge PR #2** (hello v19 + Stay signed in) into `main` on GitHub — or stay on branch `cursor/hello-attention-stay-signed-in-v19-80cc` until merged.
2. **Postgres migration 008** on Render (if not done):

```powershell
cd C:\Findr\api
$env:DATABASE_URL = "<render-external-database-url>"
npm install
node ..\db\scripts\apply-migration.mjs ..\db\migrations\008_hello_attention.sql
```

3. **Render:** deploy **findr-api** from `main` (or current branch).
4. **Build from git**, not a robocopy-only folder:

```powershell
cd C:\Findr\mobile
```

(`Test-Path C:\Findr\.git` must be **True**.)

---

## Step 1 — Unlock EAS cloud builds (required for fastest route)

In PowerShell:

```powershell
eas billing:subscribe starter --account tomas_empire
```

Or pay at: https://expo.dev/accounts/tomas_empire/settings/billing

Preview APKs use profile `preview`. **Play Store** uses profile **`production`** (`.aab`).

---

## Step 2 — Android signing (first time only)

EAS can create and store the upload keystore:

```powershell
cd C:\Findr\mobile
eas credentials -p android
```

Choose **production**, let EAS **generate** a new keystore if asked, and **download the backup** when offered (save the file somewhere safe — EmpireGold-style backup folder).

---

## Step 3 — Production AAB build

```powershell
cd C:\Findr\mobile
npm install
eas build -p android --profile production
```

When it finishes, download the **.aab** from the Expo dashboard link in the terminal.

`versionCode` is in `mobile/app.json` (currently **19**). Bump `versionCode` (+1) and `version` string for every new Play upload.

---

## Step 4 — Google Play Console

1. https://play.google.com/console — create app **Findr** (if new), package **`app.findr.mobile`** (must match `app.json`).
2. **Internal testing** track first (fastest review): create release → upload the **.aab**.
3. Fill required forms (can parallel while build runs):
   - **Privacy policy** URL (public HTTPS — e.g. site hosting your Terms/Privacy or `https://myfindr.fun` if you host legal there).
   - **Data safety** (location, photos, messages, account email — match the app).
   - **Account deletion** — app has delete account in Settings; describe that in Play listing.
   - **18+** / dating content declarations as applicable.
4. Add testers on internal testing, install from Play link on the S9.

### Optional: submit from PC

After linking a Google Play service account to Expo:

```powershell
eas submit -p android --profile production --latest
```

Manual upload of the `.aab` in Play Console works the same if you skip `eas submit`.

---

## While waiting on EAS / Play (don’t stop testing)

```powershell
cd C:\Findr\mobile
npx expo start
```

Expo Go on the S9 + `https://api.myfindr.fun` — verify login, Stay signed in, Say Hello, chat. **Does not** use EAS build quota.

---

## If you refuse to pay Expo this month

Local cloud bypass (needs Android Studio + SDK, 1–2 hr first time):

```powershell
cd C:\Findr\mobile
eas build -p android --profile production --local
```

Then upload the `.aab` to Play Console manually.

---

## Checklist (v19)

| Item | Status |
|------|--------|
| `C:\Findr` git clone + v19 branch | you |
| Migration 008 + findr-api deploy | you |
| EAS Starter (or local build) | you |
| `eas build --profile production` → `.aab` | you |
| Play Console internal testing release | you |
