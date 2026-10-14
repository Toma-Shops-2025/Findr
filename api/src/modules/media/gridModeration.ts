import type { MediaType } from './storage.js';

/**
 * Grid (profile) photos must not be video and must respect size limits.
 * Explicit-image ML is not wired yet; rely on guidelines + reports + admin queue.
 */
export function assertProfileGridUploadAllowed(
  mediaType: MediaType,
  byteLength: number,
): void {
  if (mediaType === 'video') {
    const err = new Error('profile_grid_no_video') as Error & { code?: string };
    err.code = 'profile_grid_no_video';
    throw err;
  }
  if (byteLength < 512) {
    const err = new Error('profile_grid_too_small') as Error & { code?: string };
    err.code = 'profile_grid_too_small';
    throw err;
  }
}
