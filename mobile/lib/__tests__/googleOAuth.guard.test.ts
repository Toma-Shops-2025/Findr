/**
 * Regression guard: Google OAuth helpers must stay stable (no React Native imports).
 * Run: npm run test:oauth (from mobile/)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  endOAuthLogin,
  endOAuthResolve,
  resetGoogleOAuthFinishLocks,
  tryBeginOAuthLogin,
  tryBeginOAuthResolve,
} from '../googleOAuthFinishLocks';

const mobileLib = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('completeGoogleSignIn root guard', () => {
  it('disables root finisher on login, onboarding, and oauth redirect routes', () => {
    const src = readFileSync(join(mobileLib, 'completeGoogleSignIn.ts'), 'utf8');
    assert.match(
      src,
      /useCompleteGoogleSignIn\(!onDedicatedOAuth && !onAuthEntry\)/,
    );
    assert.ok(src.includes("pathname === '/oauth2redirect'"));
    assert.ok(src.includes("pathname === '/oauthredirect'"));
    assert.ok(src.includes('login'));
    assert.ok(src.includes('onboarding'));
  });
});

describe('googleAuth PKCE guard', () => {
  it('forces pending OAuth save before promptAsync', () => {
    const src = readFileSync(join(mobileLib, 'googleAuth.ts'), 'utf8');
    assert.match(src, /savePendingGoogleOAuth\([\s\S]*force:\s*true/);
  });
});

describe('googleOAuthRedirectScreen guard', () => {
  it('uses shared finish locks and declarative nearby navigation', () => {
    const src = readFileSync(
      join(mobileLib, 'googleOAuthRedirectScreen.ts'),
      'utf8',
    );
    assert.ok(src.includes('acquireOAuthLogin'));
    assert.ok(src.includes('acquireOAuthResolve'));
    assert.match(src, /router\.replace\('\/\(tabs\)\/nearby'\)/);
  });
});

describe('auth session guard', () => {
  it('mounts push handler without blocking OAuth persist path', () => {
    const src = readFileSync(join(mobileLib, 'auth.tsx'), 'utf8');
    assert.ok(src.includes('PushNotificationHandler'));
    assert.ok(src.includes('GoogleAuthSessionHandler'));
    assert.doesNotMatch(
      src,
      /loginWithGoogle[\s\S]{0,800}await registerForPush/,
    );
  });
});

describe('googleOAuthFinishLocks', () => {
  it('single-flights resolve and login', () => {
    resetGoogleOAuthFinishLocks();
    assert.equal(tryBeginOAuthResolve(), true);
    assert.equal(tryBeginOAuthResolve(), false);
    endOAuthResolve();
    assert.equal(tryBeginOAuthLogin(), true);
    assert.equal(tryBeginOAuthLogin(), false);
    endOAuthLogin();
    resetGoogleOAuthFinishLocks();
    assert.equal(tryBeginOAuthResolve(), true);
    endOAuthResolve();
  });
});
