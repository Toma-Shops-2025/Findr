import { getApiBaseUrl } from '@/lib/api';

/**
 * Turn API-relative `/uploads/…` paths into absolute URLs for Image/Video.
 * Absolute http(s) and stub: values pass through (stubs return null for display).
 */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('stub:')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${getApiBaseUrl()}${trimmed}`;
  }
  return null;
}

export function primaryPhotoUrl(
  photoUrls: string[] | null | undefined,
): string | null {
  if (!photoUrls?.length) return null;
  for (const u of photoUrls) {
    const resolved = resolveMediaUrl(u);
    if (resolved) return resolved;
  }
  return null;
}
