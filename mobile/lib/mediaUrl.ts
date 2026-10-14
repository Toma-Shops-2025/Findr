import { getApiBaseUrl } from '@/lib/api';

/** Map any known object-storage URL to API `/uploads/...` (RN Image/Video load from API, not R2 redirect). */
function rewriteToUploadsPath(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return trimmed;

  // api.myfindr.fun/uploads/chat/foo.jpg
  const apiUploads = trimmed.match(/\/uploads\/((?:profiles|chat|album|videos)\/[^/?#]+)/i);
  if (apiUploads) return `/uploads/${apiUploads[1]}`;

  // R2 public: .../findr/profiles/uuid.jpg
  const r2Findr = trimmed.match(/\/findr\/(profiles|chat|album|videos)\/([^/?#]+)/i);
  if (r2Findr) return `/uploads/${r2Findr[1]}/${r2Findr[2]}`;

  // Legacy path without findr prefix
  const bare = trimmed.match(/\/(profiles|chat|album|videos)\/([a-f0-9-]{36}\.[a-z0-9]+)/i);
  if (bare && (trimmed.includes('r2.dev') || trimmed.includes('r2.cloudflarestorage'))) {
    return `/uploads/${bare[1]}/${bare[2]}`;
  }

  return trimmed;
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
    trimmed = rewriteToUploadsPath(trimmed);
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
