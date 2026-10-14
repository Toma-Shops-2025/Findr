# Founder alerts (email + phone push)

When something needs investigation (safety reports, auto-hidden profiles), the API can notify you.

## Email (always try)

Set on Render **findr-api**:

| Variable | Example |
|----------|---------|
| `RESEND_API_KEY` | from Resend dashboard |
| `EMAIL_FROM` | `Findr <onboarding@resend.dev>` or your verified domain |
| `SAFETY_ALERT_TO` or `FOUNDER_ALERT_EMAIL` | `contactus@myfindr.fun` or your phone’s Gmail |

Every **safety report** sends an email with reason, IDs, and link to **Admin**.

## Phone push (optional)

1. Install your **production** Findr build on your phone and sign in.
2. Allow notifications when prompted.
3. Get your **Expo push token** (one-time):
   - Temporarily log it from the app, or use Expo’s push tool after you capture the token from `POST /devices/push-token` in API logs during your login.
4. On Render, set:

```
FOUNDER_EXPO_PUSH_TOKEN=ExponentPushToken[xxxxxxxxxxxxxx]
```

You can comma-separate multiple tokens.

Also set `EXPO_ACCESS_TOKEN` (Expo account) for reliable delivery in production.

## Admin queue

Open reports: https://api.myfindr.fun/admin/  
(`ADMIN_EMAIL` + `ADMIN_PASSWORD_BCRYPT` on the API)

## When alerts fire

- Any user **Report** submitted
- Profile **auto-hidden** after `SAFETY_AUTO_HIDE_OPEN_REPORTS` (default 3) distinct open reports
