# Findr — agent instructions

## Google OAuth (do not break)

Google sign-in is **production-critical**. Before merging mobile auth changes:

1. Run **`cd mobile && npm run test:oauth`** and **`npm run typecheck`**.
2. Humans: install git hooks once per clone — PowerShell: **`.\scripts\install-git-hooks.ps1`** or **`git config core.hooksPath scripts/git-hooks`**; macOS/Linux: **`./scripts/install-git-hooks.sh`**.
3. Run **`cd api && npm run typecheck`** if you touched auth or user store.
4. Read **`docs/google-oauth-regression.md`** — files and rules below.

### Protected flow (Android)

- `promptAsync` saves PKCE with **`savePendingGoogleOAuth({ force: true })`** in `mobile/lib/googleAuth.ts`.
- Return routes **`/oauth2redirect`** and **`/oauthredirect`** finish sign-in via **`useGoogleOAuthRedirectScreen`** only.
- Root finisher **`useCompleteGoogleSignInAtRoot`** must stay **off** on `login`, `onboarding`, and dedicated oauth redirect routes.
- Do **not** reset OAuth finish locks on redirect screen mount except when `?code=` is present (see redirect hook).
- Do **not** block **`setSession`** before storage/push in `persistSession` (`mobile/lib/auth.tsx`).

### Manual smoke (production build)

1. Google **signup** → Nearby in a few seconds.
2. Force-close app → **Continue with Google** on login → `POST /auth/google` **200** in Render logs.
3. Email login still works.

## Android AAB (Play)

- **Bump `mobile/app.json` `android.versionCode` before every GitHub AAB build** (Play rejects reused codes). See **`docs/android-aab-release.md`**.

## Other checks

- **`npm run test:oauth`** in `mobile/` on every PR that touches `mobile/lib/google*` or `mobile/lib/auth.tsx`.
- Chat/realtime: `mobile/lib/realtime.ts` must use **`realtimeWebSocketUrl()`** (`wss://` for HTTPS API).
- Push deep link payload: use **`chatNotificationData()`** in `api/src/modules/push/deepLink.ts`.

## Cursor Cloud

- API: `cd api && npm run dev` (needs `DATABASE_URL` for Postgres).
- Mobile: `cd mobile && npm start` — use `EXPO_PUBLIC_API_URL` for device testing.
- Apply DB migrations: `node db/scripts/apply-pending-migrations.mjs` with Render external `DATABASE_URL`.
