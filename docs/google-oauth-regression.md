# Google OAuth regression guard

## Automated

```bash
cd mobile && npm run test:oauth
cd mobile && npm run typecheck
cd api && npm run typecheck
```

CI workflow **`.github/workflows/ci-guardrails.yml`** runs **`test:oauth`** (required) plus typecheck on every pull request.

### PR checklist (humans + agents)

- [ ] Touched `mobile/lib/google*` or `auth.tsx`? Run `npm run test:oauth`.
- [ ] Did **not** enable root Google finisher on login/onboarding/oauth routes.
- [ ] Smoke Google sign-in on a production build after auth changes.

## Files — treat as high risk

| Area | Files |
|------|--------|
| PKCE + prompt | `mobile/lib/googleAuth.ts`, `mobile/lib/googleOAuthRecovery.ts` |
| Finish locks | `mobile/lib/googleOAuthFinishLocks.ts` |
| Redirect UI | `mobile/lib/googleOAuthRedirectScreen.ts`, `mobile/app/oauth2redirect.tsx`, `mobile/app/oauthredirect.tsx` |
| Root finisher | `mobile/lib/completeGoogleSignIn.ts`, `mobile/components/GoogleAuthSessionHandler.tsx` |
| Session | `mobile/lib/auth.tsx` (`persistSession`, `loginWithGoogle`) |
| API | `api/src/routes/auth.ts`, `api/src/modules/auth/googleToken.ts`, `api/src/modules/auth/userStore.ts` |

## Rules agents must not violate

1. **Never** run the root Google finisher on login/onboarding while Android uses the custom-scheme redirect.
2. **Never** `await` push registration inside the critical path before `setSession` for OAuth.
3. **Never** remove `<Redirect href="/(tabs)/nearby" />` when `accessToken` is set on oauth redirect screens.
4. **Always** use shared finish locks for concurrent resolve/login.
5. Timeout handlers must read **live** `accessToken` (ref), not a stale closure.

## Render verification

After deploy, Live tail during one Google sign-in:

- `POST /auth/google` → **200**
- Within seconds: `/chat/unread-count`, `/geo/nearby`

If OAuth spins with **no** `/auth/google`, the bug is on the **mobile** finish path, not the database.
