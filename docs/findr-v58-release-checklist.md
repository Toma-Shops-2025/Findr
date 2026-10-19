# Findr v58 — step-by-step release checklist

Use this **in order** after merging the Google return-sign-in + guardrails work (PR **#31** / branch `cursor/google-return-signin-d58e`). Each step explains *what* you are doing and *how*.

---

## Step 0 — One-time: install the OAuth pre-push hook (your laptop)

**What:** Git will run `npm run test:oauth` automatically before you `git push` if the push includes Google auth files. That catches regressions before they reach GitHub.

**How:**

1. Open a terminal in your Findr repo folder (where `.git` lives).
2. Run:

   ```bash
   chmod +x scripts/install-git-hooks.sh
   ./scripts/install-git-hooks.sh
   ```

3. You should see: `core.hooksPath = scripts/git-hooks`.

**Notes:**

- Repeat **Step 0** on every computer or fresh `git clone` you use.
- To push without the check once: `SKIP_OAUTH_HOOK=1 git push` or `git push --no-verify`.
- CI on GitHub still runs the same tests on pull requests even if you skip the hook.

---

## Step 1 — Review and merge the pull request

**What:** Get the v57/v58 mobile fixes, OAuth guardrails, push deep links, and API `google_sub` linking into `main`.

**How:**

1. Open GitHub → **Toma-Shops-2025/Findr** → **Pull requests** → open **#31** (or the PR titled Google return-sign-in + OAuth guardrails).
2. Wait for **CI guardrails** (green) — it must pass `test:oauth`.
3. Click **Merge pull request** (squash or merge per your preference).
4. Confirm **Render** auto-deploys **findr-api** from `main` (or trigger a manual deploy if you deploy by tag).

**Why:** Production API and future EAS builds should track `main` after you ship the app.

---

## Step 2 — Apply database migration 016 on Render Postgres

**What:** Adds `google_sub` so a user who already has an **email/password** account can also sign in with **Google** when the email matches (instead of a confusing `409 email_taken`).

**How:**

1. In [Render](https://dashboard.render.com) → your **PostgreSQL** service → **Connect** → copy the **External Database URL** (starts with `postgres://`).
2. On your machine, from the repo root (with Node installed):

   **macOS / Linux:**

   ```bash
   cd api
   export DATABASE_URL='paste-external-url-here'
   node ../db/scripts/apply-pending-migrations.mjs
   ```

   **Windows PowerShell:**

   ```powershell
   cd api
   $env:DATABASE_URL = "paste-external-url-here"
   node ..\db\scripts\apply-pending-migrations.mjs
   ```

3. Look for output that includes applying **`016_google_sub_link.sql`** (or “no pending migrations” if already applied).
4. If the script errors, fix `DATABASE_URL` (SSL, password) before building the app.

**Why:** Without this, linking Google to an existing email account may not work in production.

More context: `docs/findr-render-production.md`.

---

## Step 3 — Confirm API deployed and healthy

**What:** Ensure the live API matches `main` and auth still works.

**How:**

1. Render → **findr-api** → **Logs** → confirm a recent deploy after merge.
2. In a browser or terminal:

   ```bash
   curl -s https://api.myfindr.fun/health
   ```

   Expect JSON with `ok: true` (or your existing health shape).

3. Optional — realtime health (new in v58):

   ```bash
   curl -s https://api.myfindr.fun/realtime/health
   ```

   Expect `wsPath: "/realtime/ws"`. A **404** here means WS is not wired on Render yet; chat still works via HTTP polling.

**Why:** Mobile v58 talks to this API; push payloads use the new deep-link fields.

---

## Step 4 — Build Android production app (EAS)

**What:** Create a **Play Store–ready** build with **versionCode 58** (in `mobile/app.json` on `main`).

**How:**

1. Install EAS CLI if needed: `npm i -g eas-cli`
2. Log in: `eas login`
3. From repo:

   ```bash
   cd mobile
   eas build --platform android --profile production
   ```

4. Wait for the build on [expo.dev](https://expo.dev) → your project → **Builds**.
5. Download the **.aab** when finished.

**Why:** Google OAuth and redirect URIs are baked into the native build; production profile sets `EXPO_PUBLIC_API_URL` and Google client IDs (`mobile/eas.json`).

---

## Step 5 — Upload to Google Play (internal or production track)

**What:** Ship the new AAB to testers or production.

**How:**

1. [Google Play Console](https://play.google.com/console) → **Findr** → **Release** → **Testing** (internal/closed) or **Production**.
2. **Create new release** → upload the **.aab** from Step 4.
3. Release notes (example): “Google sign-in improvements, push opens chat, account linking, v58.”
4. **Review and roll out** (internal first is recommended).

**Why:** Users must install the build that includes v57 return-sign-in + v58 guardrails.

---

## Step 6 — Smoke test Google sign-in (required)

**What:** Prove OAuth still works on a **real device** with the new build (not Expo Go).

**How:**

1. Install the build from Play (internal link or production).
2. **Test A — New or returning Google user**
   - Tap **Continue with Google** → pick account → you should land on **Nearby** within a few seconds.
3. **Test B — Return sign-in**
   - Force-close the app (swipe away from recents).
   - Open Findr → **Continue with Google** again → should sign in without endless spinner.
4. **Test C — Email login** (if you use password accounts): still works.
5. On Render **findr-api** logs during Test A/B, confirm:

   - `POST /auth/google` → **200**
   - Shortly after: `/chat/unread-count`, `/geo/nearby`

**If it spins with no `/auth/google`:** problem is on the **phone** finish path — see `docs/google-oauth-regression.md`.

**Emergency kill switch (old builds only):** `EXPO_PUBLIC_DISABLE_GOOGLE_AUTH=true` in EAS env disables Google button (do not use unless debugging).

---

## Step 7 — Optional: push notification deep link

**What:** Tapping a chat push should open that thread.

**How:**

1. On Render **findr-api**, set **`EXPO_ACCESS_TOKEN`** (Expo account token) if not already — see `docs/findr-render-production.md`.
2. Two devices (or two accounts): send a chat message; recipient gets push.
3. Tap notification → app opens **`/chat/<id>`**.

**Why:** v58 sends `conversationId` and `findr://chat/...` in the payload.

---

## Step 8 — Optional: Google + same email linking

**What:** User created account with email/password, later uses Google with the **same email**.

**How:**

1. After **Step 2** (migration 016), sign in with Google using that email.
2. Expect success (not `409 email_taken` in app).
3. Render log: `POST /auth/google` **200**.

---

## Step 9 — Day-to-day development habits

| When | What to do |
|------|------------|
| Before pushing auth changes | Hook runs `test:oauth` automatically; or run `cd mobile && npm run test:oauth` |
| Opening a PR | Wait for **CI guardrails** green |
| After any auth change | Repeat **Step 6** on a production-style build |
| Agents / Cursor | Read **`AGENTS.md`** and **`docs/google-oauth-regression.md`** |

---

## Quick reference

| Item | Value |
|------|--------|
| API | `https://api.myfindr.fun` |
| Android package | `app.findr.mobile` |
| versionCode (v58) | **58** |
| Migration | `016_google_sub_link.sql` |
| OAuth tests | `cd mobile && npm run test:oauth` |
