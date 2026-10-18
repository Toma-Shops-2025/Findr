let resolveInFlight = false;
let loginInFlight = false;

export function tryBeginOAuthResolve(): boolean {
  if (resolveInFlight) return false;
  resolveInFlight = true;
  return true;
}

export function endOAuthResolve(): void {
  resolveInFlight = false;
}

export function tryBeginOAuthLogin(): boolean {
  if (loginInFlight) return false;
  loginInFlight = true;
  return true;
}

export function endOAuthLogin(): void {
  loginInFlight = false;
}

export function resetGoogleOAuthFinishLocks(): void {
  resolveInFlight = false;
  loginInFlight = false;
}

export function isOAuthLoginInFlight(): boolean {
  return loginInFlight;
}

const LOCK_POLL_MS = 75;

/** Wait for a stuck resolve lock (e.g. root handler unmounted mid-flight). */
export async function acquireOAuthResolve(maxWaitMs = 4_000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (tryBeginOAuthResolve()) return true;
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
  }
  return false;
}

/** Wait for another finisher or take the login slot. */
export async function acquireOAuthLogin(maxWaitMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (tryBeginOAuthLogin()) return true;
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
  }
  return false;
}
