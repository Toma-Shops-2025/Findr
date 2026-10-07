/** Strip demo seed prefix from display names (Play screenshots / Nearby). */
export function sanitizeDisplayNameForPublic(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^SAMPLE\s+/i, '').trim();
}

/** Hide obvious seed-account bios from public profile responses. */
export function sanitizeBioForPublic(bio: string): string {
  const trimmed = bio.trim();
  if (!trimmed) return '';
  if (/^SAMPLE account/i.test(trimmed)) return '';
  if (/not a real person/i.test(trimmed)) return '';
  return trimmed;
}
