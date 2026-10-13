import { getApiBaseUrl } from '@/lib/api';

/** Legacy full R2 URLs → API /uploads/ path (server redirects to object storage). */
function rewriteLegacyObjectUrl(url: string): string {
  const match = url.match(
    /\/findr\/(profiles|chat|album|videos)\/([^/?#]+)$/i,
  );
  if (match) {
    return `/uploads/${match[1]}/${match[2]}`;
  }
  return url;
}

/**
 * Turn API-relative `/uploads/...` paths into absolute URLs for Image/Video.
 * Absolute http(s) and stub: values pass through (stubs return null for display).
 */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  let trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('stub:')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    trimmed = rewriteLegacyObjectUrl(trimmed);
    if (trimmed.startsWith('/')) {
      return `${getApiBaseUrl()}${trimmed}`;
    }
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