# Engineering hygiene (what those items mean)

## Migration runner

**Problem:** You have many SQL files in `db/migrations/`. It is easy to forget which ones ran on Render.

**Fix in this repo:**

- `013_schema_migrations.sql` creates a `schema_migrations` table.
- `node db/scripts/migration-status.mjs` — lists OK vs PENDING (also guesses legacy applies).
- `node db/scripts/apply-pending-migrations.mjs` — applies only files not yet recorded.

Run against Render with your External `DATABASE_URL` (see `docs/windows-pc-git-setup.md`).

## Arm-only AAB builds (faster CI)

Android phones today are almost all **ARM** (`arm64-v8a`). Building x86 slices for emulators in release AABs wastes GitHub Actions time.

`mobile/app.json` can set `expo-build-properties` → `android.abiFilters: ["arm64-v8a"]` for production builds. You still test on a real phone (Galaxy S9 is ARM).

## Dead `src/` web prototype

At the repo root, `src/` + Vite files are an **old web mock**, not the Expo app (`mobile/`). Keeping it causes confusion (“which Findr is real?”). Options:

- Delete when you are sure nothing references it, or
- Leave it but never open it for Play builds — only `mobile/` ships.

The Expo app is the product; `api/` + `db/` back it.
