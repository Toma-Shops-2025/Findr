# Findr

Inclusive, location-based dating / hookup for adults (18+) of every orientation.

**Owner:** Toma Adkins (TomasEmpire)  
**Repo:** standalone — this is the Findr source of truth (not nested under EmpireGold / Play 'n Payday).  
**Platform:** **Android-first** (Play Store). Built with **Expo / React Native** so iOS can ship later without a rewrite. No Apple Developer / App Store work is required for this phase.

## Layout

```
Findr/
  mobile/              Expo (React Native) app — Android-focused
  api/                 Fastify + TypeScript API (JWT auth)
  db/                  Postgres + PostGIS migrations
  docker-compose.yml
  README.md
```

## Prerequisites (Windows + Galaxy S9)

- Node.js 20+ (https://nodejs.org)
- npm (comes with Node)
- Expo Go on your **Samsung Galaxy S9** (Play Store)
- PC and S9 on the **same Wi‑Fi**
- Docker Desktop (optional — only needed for Postgres + PostGIS locally)

## Clone (Windows)

```powershell
cd C:\Users\SexyMimi
git clone https://github.com/Toma-Shops-2025/Findr.git Findr
cd C:\Users\SexyMimi\Findr
```

## 1) Run the API

```powershell
cd C:\Users\SexyMimi\Findr\api
copy .env.example .env
npm install
npm run dev
```

Health check (on the PC):

```powershell
curl http://localhost:4000/health
```

Default API listens on `0.0.0.0:4000` so your phone can reach it via the PC’s LAN IP.

Auth endpoints (MVP):

- `POST /auth/signup` — email + password + DOB (18+) + TOS/privacy
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me` — Bearer JWT

Without Docker, the API uses an **in-memory** user store (fine for first Expo Go smoke tests). Set `DATABASE_URL` and start Postgres for persistent accounts.

## 2) Run the database (optional)

```powershell
cd C:\Users\SexyMimi\Findr
docker compose up -d db
docker compose exec -T db psql -U findr -d findr < db/migrations/001_init.sql
```

Connection string: `postgres://findr:findr@localhost:5432/findr`

## 3) Run the Android app (Expo Go on Galaxy S9)

```powershell
cd C:\Users\SexyMimi\Findr\mobile
npm install
npm start
```

Then:

1. Open **Expo Go** on the S9.
2. Scan the QR code from the terminal (same Wi‑Fi as the PC).
3. Or run `npm run android:go` if a device/emulator is already connected via ADB.

Point the app at your PC’s LAN IP (not `localhost`) when testing auth from the phone. Example in `mobile/.env` or Expo extra:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
```

Find your PC IP in PowerShell: `ipconfig` → **IPv4 Address** under your Wi‑Fi adapter.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Expo dev server (scan QR in Expo Go) |
| `npm run android` | Open on Android emulator / connected device |
| `npm run android:go` | Prefer Expo Go on device |
| `npm run ios` | iOS later (needs macOS / Apple tooling) |
| `npm run web` | Quick UI smoke on web only |

App screens: **signup / login / 18+ gate**, **Nearby** grid, **Profile**, **Chats** / thread, **Settings** (logout + safety stubs).

## Brand

- Name: **Findr** (`app.findr.mobile`)
- Visual direction: deep ink + warm coral + teal accents; Fraunces + Outfit — original Findr identity, not a competitor lookalike.

## Out of scope (this scaffold)

Production auth vendor swap (Clerk/Supabase), real chat vendor, NSFW scanning, payments, map/stories/video. Clear `TODO` comments mark buy-vs-build seams.

## License / IP

Original Findr naming and UI only. Do not copy competitor trademarks, assets, or trade dress.
