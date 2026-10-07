# Findr — Play Console content ratings (Grindr-style / adult dating)

Use with **Social or Communication** → **Social** → dating **Yes**.  
Answers assume **18+ only**, **user-generated** photos/chat, **adult nudity permitted** in-app (like major hookup apps), **SFW store listing**.

**Not legal advice.** Align product, Guidelines, and moderation with these answers before you submit.

---

## Step 1 — Category & email

| Field | Answer |
|--------|--------|
| Email | Your contact (e.g. `mytomaai@gmail.com` or `contactus@myfindr.fun`) |
| Category | **Social or Communication** |
| App type | **Social** |
| Dating / sexual relationships (significant portion) | **Yes** |
| Permit **public** sharing of nudity | **Yes** * |

\*If the form splits **public profile** vs **private chat**:  
- **Public profile / grid visible to others:** **Yes** if users can post nude or explicit photos others can see without mutual match (Grindr-style).  
- **Only in private 1:1 after opening chat:** some forms allow **No** on “public” nudity and **Yes** on sexual content in private communication — answer per **your shipped** UX.

---

## Step 2 — Typical follow-up themes (answer honestly)

| Theme | Grindr-style answer |
|--------|---------------------|
| User-generated content | **Yes** |
| Users interact / communicate | **Yes** |
| Share location | **Yes** |
| Share personal info with people they don’t know | **Yes** |
| Sexual content or nudity | **Yes** (user-generated) |
| Violence | **No** / None (in app design) |
| Gambling | **No** |
| Drugs / alcohol focus | **No** (unless you promote it) |
| Horror / fear | **No** |
| Profanity | **Yes** (user chat) |
| Controlled substances sale | **No** |
| Minors / appeal to children | **No** — **18+ only** |

**Expected rating:** **Mature 17+** or **18+** in many regions (IARC). That is normal for dating/hookup apps.

---

## Step 3 — What Play still expects (how apps “get past” review)

1. **Store listing** — No nudity or explicit acts in **screenshots**, icon, or description.  
2. **18+ gate** — Signup attestation (+ policy); no child-directed UX.  
3. **Policies live** — Privacy `https://myfindr.fun/privacy/`, Terms, **Community Guidelines** that match what you allow.  
4. **Safety** — Report, block, delete account (`https://myfindr.fun/delete-account/`).  
5. **Data safety** — Photos, messages, sexual orientation, location, email (see `docs/findr-play-data-safety-cheatsheet.md`).  
6. **Ads** — **No** (no ad SDK) unless you add ads later.  
7. **Moderation story** — Illegal content (minors, NCII/threats) prohibited; reports reviewed; bans possible (even if MVP is light, policy must say so).

Grindr does **not** lie on “nudity permitted”; they take a **high maturity** rating and keep the **Play store page** clean.

---

## Step 4 — Data safety tweaks (vs non-adult MVP)

Ensure **Yes** where applicable:

- **Sexual orientation**, **Other personal info** (gender, intents, bio)  
- **Photos** (including adult images users upload)  
- **Messages** (including explicit chat)  
- **Location** (approximate + precise if GPS used)  
- Purposes: **App functionality**, **Account management**, safety/fraud  

---

## Step 5 — If review asks questions

- “Adult dating app; 18+ only; user-generated photos and messages; community guidelines prohibit illegal content, minors, and non-consensual imagery; report and block in-app.”  
- Do **not** claim the app is “family friendly.”

---

## Product vs questionnaire

If v19 **does not yet** show nude profile photos but you answer **Yes** to permitted nudity, you are declaring **policy/intent** for an adult hookup product. Ship guideline-aligned features soon or tighten answers to **current** behavior until you do.

See updated **Community Guidelines** in-app (`mobile/app/legal/guidelines.tsx`) for adult-media rules aligned with this path.
