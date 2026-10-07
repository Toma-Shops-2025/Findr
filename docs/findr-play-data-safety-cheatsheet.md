# Findr — Google Play **Data safety** cheat sheet

Use this while filling **Play Console → App content → Data safety**. Answers match the **current MVP** (Expo app + `api.myfindr.fun`, versionCode 19). If you add analytics, ads, or new SDKs later, **update this form**.

**Keep handy**

| Item | Value |
|------|--------|
| Package name | `app.findr.mobile` |
| Privacy policy URL | Use your public policy URL (in-app policy + ideally `https://myfindr.fun` privacy page if hosted) |
| Account deletion URL | `https://myfindr.fun/delete-account/` |
| Support / privacy email | `contactus@myfindr.fun` |
| App category | Dating / Social (18+) |

---

## Part 1 — Start the form

1. Play Console → **Findr** → **Policy and programs** → **App content**.
2. Find **Data safety** → **Start** or **Manage**.
3. **Does your app collect or share any of the required user data types?**  
   → **Yes**

4. **Is all of the user data collected by your app encrypted in transit?**  
   → **Yes** (API uses HTTPS: `https://api.myfindr.fun`)

5. **Do you provide a way for users to request that their data is deleted?**  
   → **Yes**  
   - In-app: **Safety** tab → **Delete account**  
   - Web: `https://myfindr.fun/delete-account/`  
   - Email: `contactus@myfindr.fun`

6. **Independent security review** (if asked)  
   → **No** (unless you paid for one)

7. **Does your app sell user data?**  
   → **No**

---

## Part 2 — Data types to declare (checklist)

For each type below, in Play’s UI you typically mark:

- **Collected** = sent off the device to your servers (or stored in your backend).
- **Shared** = transmitted to a **third party** (not other Findr users).  
  For MVP, third parties are mainly **infrastructure** (hosting/DB), not ad networks.

**Not collected in the shipped app today (leave OFF / No):**

- Financial info  
- Health and fitness  
- Contacts  
- Calendar  
- Web browsing history  
- Ads / Advertising ID (no ad SDK in the app)  
- Credit info  
- Files and docs (generic) — unless Play maps photos separately (use Photos/Videos below)

---

### A. Location

| Play label | Collect? | Share with 3rd parties? | Purpose | Optional? |
|------------|----------|-------------------------|---------|-----------|
| **Approximate location** | **Yes** | **Yes** (hosting provider) | **App functionality** (Nearby, distance labels; stored fuzzed) | **Optional** (user can deny OS permission; Nearby degrades) |
| **Precise location** | **Yes** * | **Yes** (hosting) | **App functionality** (device GPS read to compute Nearby; you fuzz before/show bands) | **Optional** |

\*If Play only lets you pick one: many dating apps declare **both** when GPS is used, because the OS returns precise coordinates even if you fuzz for display/storage. Your in-app copy says approximate/fuzzed — still accurate to declare precise **collected** if GPS is read.

**Ephemeral / temporary:** No (location updates can be stored server-side for Nearby).

---

### B. Personal info

| Play label | Collect? | Share? | Purpose | Optional? |
|------------|----------|--------|---------|-----------|
| **Email address** | **Yes** | **Yes** (hosting) | **Account management**, **App functionality** | **Required** (for account) |
| **Name** | **Yes** | **Yes** | **App functionality** (display name on profile) | **Optional** (user chooses display name) |
| **User IDs** | **Yes** | **Yes** | **Account management**, **App functionality** | **Required** (internal account id) |
| **Sexual orientation** | **Yes** | **Yes** | **App functionality** (profile fields user can show) | **Optional** |
| **Other info** (e.g. gender identity, “looking for”, bio, age) | **Yes** | **Yes** | **App functionality** | **Optional** |

**Date of birth:** MVP signup uses **18+ attestation**; DOB may be added on profile later. If you only store attestation and computed age, you can use **Other info** or **Personal info → Other** and describe “age verification / age display” in the details box if Play offers free text.

**Password:** Not listed as its own type; handled server-side as **hashed** credentials under account management (email + auth).

---

### C. Photos and videos

| Play label | Collect? | Share? | Purpose | Optional? |
|------------|----------|--------|---------|-----------|
| **Photos** | **Yes** | **Yes** (hosting/storage) | **App functionality** (profile photos, chat images, album) | **Optional** |
| **Videos** | **Yes** | **Yes** | **App functionality** (chat video uploads / stubs) | **Optional** |

---

### D. Messages

| Play label | Collect? | Share? | Purpose | Optional? |
|------------|----------|--------|---------|-----------|
| **Other in-app messages** | **Yes** | **Yes** (hosting) | **App functionality** (1:1 chat, hello messages, likes on messages) | **Required** for chat feature |

Includes text, shared images, optional location pins in chat, and “Hello” attention messages.

---

### E. App info and performance (be conservative)

| Play label | Collect? | Share? | Purpose | Optional? |
|------------|----------|--------|---------|-----------|
| **Crash logs** | **No** * | — | — | — |
| **Diagnostics** | **No** * | — | — | — |

\*The mobile app does **not** embed Firebase Crashlytics / Sentry in the current repo. Your API may write **server logs** (IPs, request errors) on Render — that is **not** the same as “crash logs” in the Play form unless you add a crash SDK. If Play forces “diagnostics” because of server logging, mark **Diagnostics → Yes**, purpose **Fraud prevention, security, and compliance** or **App functionality**, shared with **hosting provider only**.

---

### F. Device or other IDs

| Play label | Collect? | Share? | Purpose | Optional? |
|------------|----------|--------|---------|-----------|
| **Device or other IDs** | **No** | — | — | — |

No advertising ID. Session JWT in **Expo SecureStore** is an auth token, not typically declared as “Device ID” unless Google’s questionnaire treats it that way; if asked about “authentication tokens,” tie to **Account management**.

---

## Part 3 — “Shared with third parties”

When Play asks **who** data is shared with:

| Third party | Role | What |
|-------------|------|------|
| **Render** (or your host) | Cloud hosting | API, uploads, logs |
| **Postgres** (e.g. on Render) | Database | Account, profile, location, messages metadata |
| **Other Findr users** | In-app | Profile fields you publish, messages you send — Play often treats this as **in-app display**, not “third-party sharing” |

**Not in MVP:** ad networks, Facebook SDK, Google Analytics in the app, payment processors.

**Expo / EAS:** Used to **build** the app; the production app on a user’s phone talks to **your API**, not Expo, for account data.

For each collected type, when asked **Is this data shared?**:

- **Shared with other users** → only where relevant (profile visible to others, messages to recipient). Follow Play’s wording (sometimes “shared” means third parties only).
- **Shared with service providers** → **Yes** for hosting/DB for types you store on the server.

---

## Part 4 — Purposes (quick map)

Use these when Play asks **why** for each data type:

| Purpose | Findr use |
|---------|-----------|
| **App functionality** | Nearby, profiles, chat, photos, blocks/reports, visibility |
| **Account management** | Sign up, login, password, delete account, JWT session |
| **Safety, compliance, and fraud prevention** | Blocks, reports, 18+ gate, moderation |
| **Analytics** | **No** (unless you add analytics later) |
| **Advertising or marketing** | **No** |
| **Personalization** | **Optional** — can tie to profile / Nearby if asked |

---

## Part 5 — Security practices (end of form)

Usually:

- **Data is encrypted in transit** → **Yes** (HTTPS).
- **Users can request deletion** → **Yes** (links above).
- **Committed to Google Play Families Policy** → **No** (18+ dating).

---

## Part 6 — Store listing alignment

Play may compare Data safety to your **Privacy policy**. Your in-app policy (2026-10-04) says you collect:

- Account (email, password hash, 18+ attestation / optional DOB)  
- Profile (name, bio, photos, orientations, intents)  
- Approximate / fuzzed location for Nearby  
- Messages  
- Device/log data for operation and security  
- Reports and blocks  

**Do not sell personal data** — select **No** for selling data.

---

## Part 7 — Dating / 18+ extras

- **Target audience:** Adults **18+** only (not designed for children).
- **Content rating** questionnaire: answer honestly (dating, user-generated content, location, photos, messaging).
- **News apps / COVID** etc. — N/A.

---

## Part 8 — Order of work in Play Console (typical)

1. **Data safety** (this sheet)  
2. **Privacy policy** URL  
3. **Ads** → “No, my app does not contain ads” (if true)  
4. **Content rating** (IARC questionnaire)  
5. **Target audience** → 18+  
6. **News app** → No  
7. **COVID** → No  
8. **Data safety** → Submit  
9. **Internal testing** release with your `.aab`

---

## Part 9 — If Play rejects or flags a mismatch

Common fixes:

- **Location:** If you declared only “approximate” but permission text mentions GPS, add **precise** collected **optional** or clarify in policy.  
- **Chat / photos:** Must be **Yes** if you upload to `api.myfindr.fun`.  
- **Deletion:** Ensure `https://myfindr.fun/delete-account/` works and matches Safety → Delete account.  
- **Analytics in policy but not in app:** Either remove “analytics” from policy later or add SDK and update Data safety.

---

## One-paragraph summary (for “learn more” boxes)

> Findr collects account information (email), optional profile and dating-related fields users choose to share, photos and messages users send, and location used for Nearby discovery (shown to others as approximate distance). Data is sent to Findr’s servers over HTTPS for account management, matching, chat, and safety features. Users can delete their account in the app or via our deletion page. We do not sell personal data. Infrastructure providers host our API and database.

---

*Last updated for versionCode 19 MVP. Review with a lawyer before scaling; this is an engineering checklist, not legal advice.*
