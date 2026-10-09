# Findr — Google Play legal & policy checklist

Use this while **Publishing overview** still shows open tasks. Package: **`app.findr.mobile`**.  
Public URLs (Render **findr-web** / **myfindr.fun**):

| Purpose | URL |
|---------|-----|
| Privacy policy | https://myfindr.fun/privacy/ |
| Terms of Service | https://myfindr.fun/terms/ |
| Community guidelines | https://myfindr.fun/guidelines/ |
| Child safety standards (CSAE) | https://myfindr.fun/child-safety/ |
| Account deletion | https://myfindr.fun/delete-account/ |
| Support / privacy email | contactus@myfindr.fun |

---

## 1. Store listing (Grow → Store presence → Main store listing)

| Field | What to use |
|-------|-------------|
| App name | `Findr - Meet People Near You` (max 30 chars) |
| Short description | 80 chars — see prior draft in repo / Play draft |
| Full description | 18+ social/dating, Nearby, chat, block/report, delete account |
| App icon | 512×512 from Expo assets |
| Feature graphic | 1024×500 |
| Phone screenshots | SFW; no SAMPLE; current build tab icons |
| Category | **Social** (tags: dating as applicable) |
| Contact email | contactus@myfindr.fun (or developer email you monitor) |
| Privacy policy URL | https://myfindr.fun/privacy/ |
| **AI asset declaration** | Label **only** assets made with AI (e.g. feature graphic); real screenshots usually **no** label |

---

## 2. App content (Policy and programs → App content)

Work through every section until the dashboard shows complete.

### Privacy policy
- URL: **https://myfindr.fun/privacy/**

### App access
- If login required: provide **test credentials** for reviewers (dedicated test account on production API).

### Ads
- **No** — app has no ad SDK.

### Content ratings (IARC questionnaire)
- **Social / dating:** Yes  
- **User interaction / communication:** Yes  
- **Share location:** Yes  
- **User-generated content:** Yes  
- **Nudity / sexual content in app:** declare honestly (adult 18+ product; see `docs/findr-play-content-ratings-grindr-style.md` if present)  
- **Appeal to children:** **No** — 18+ only  
- Expect **Mature 17+ / 18+** in many regions.

### Target audience and content
- **Target age:** **18 and over** only  
- **Not** designed for children; **not** in Families program.

### News apps
- **No**

### COVID-19 apps
- **No**

### Data safety
- Follow **`docs/findr-play-data-safety-cheatsheet.md`**  
- Collect: account, profile, photos, messages, location, etc.  
- **No sale** of data  
- Deletion: in-app Safety + https://myfindr.fun/delete-account/

### Government apps
- **No**

### Financial features
- **No** in-app payments in MVP.

### Health
- **No**

### Photo and video permissions
- **READ_MEDIA_IMAGES** — user-initiated profile/chat/album pick (≤250 char declaration).

### Child safety standards (dating/social)
- **Safety standards URL:** https://myfindr.fun/child-safety/  
- **Contact:** contactus@myfindr.fun (or developer email)  
- ☑ In-app reporting (Report → **Suspected underage**)  
- ☑ Comply with laws / report to authorities — only if you will follow the published standards (NCMEC when required, etc.)

### Other declarations
- **US export laws** — standard developer attestation when prompted.  
- **Play App Signing** — use Google Play App Signing (recommended).  
- **Content declarations** for dating / UGC — answer consistently with ratings and guidelines.

---

## 3. Production API — safety reports (operator duty)

Reports are **persisted** in Postgres `reports` when `DATABASE_URL` is set.

**Child safety email (optional but recommended):** on Render **findr-api** → Environment:

| Variable | Example |
|----------|---------|
| `RESEND_API_KEY` | From https://resend.com (free tier) |
| `SAFETY_ALERT_TO` | contactus@myfindr.fun |
| `SAFETY_ALERT_FROM` | `Findr Safety <onboarding@resend.dev>` until domain verified |

Without `RESEND_API_KEY`, underage reports are still **saved** and logged in API logs.

Query open reports:
```sql
SELECT id, reason, reporter_id, target_user_id, created_at
FROM reports WHERE status = 'open' ORDER BY created_at DESC;
```

---

## 4. Before Production rollout

- [ ] All **App content** items green  
- [ ] **Closed/open testing** feedback addressed for crashers  
- [ ] **versionCode** bumped for each new AAB  
- [ ] Privacy / Terms / Guidelines / Child safety pages **live** on myfindr.fun  
- [ ] **Delete account** tested on production build  
- [ ] Reviewer test account documented  
- [ ] Data safety matches actual app behavior  
- [ ] Child safety checkboxes match in-app Report + public URL  

---

## 5. Not legal advice

Policies on myfindr.fun should be reviewed by qualified counsel before a large public launch. This checklist is an engineering/ops map for Play Console fields Findr uses today.
