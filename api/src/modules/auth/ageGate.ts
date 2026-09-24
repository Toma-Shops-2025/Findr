/** Auth domain helpers (age gate, session mapping). */
export function yearsSince(
  dobIso: string | null | undefined,
  now = new Date(),
): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function isAdult(dobIso: string): boolean {
  const age = yearsSince(dobIso);
  return age !== null && age >= 18;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
