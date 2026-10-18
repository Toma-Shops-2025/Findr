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
