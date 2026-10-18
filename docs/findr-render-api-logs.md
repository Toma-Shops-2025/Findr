# How to view findr-api logs on Render

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Click **findr-api** (your web service — not the database).
3. Open the **Logs** tab in the left sidebar.
4. Leave **Live tail** on, then try **Google sign-in** or **email login** on the phone.
5. Search the log stream for:
   - `connected to Postgres` — DB OK at startup
   - `Postgres unavailable` — wrong `DATABASE_URL` on the API service
   - `POST /auth/google` — Google sign-in reached the API
   - `[findr-auth]` — auth errors

**Tip:** Use the **External** database URL only from your PC (PowerShell migrations). The **findr-api** service on Render should use the **Internal** URL.
