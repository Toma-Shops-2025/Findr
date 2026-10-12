/** Keep in sync with mobile/lib/mediaLimits.ts */
export const PROFILE_MAX_PHOTOS = 5;
export const ALBUM_MAX_PHOTOS = 10;
export const ALBUM_MAX_VIDEOS = 1;

export type AlbumCounts = { photos: number; videos: number };

export function albumCapacityError(
  mediaType: 'photo' | 'video',
): 'album_photo_limit' | 'album_video_limit' {
  return mediaType === 'video' ? 'album_video_limit' : 'album_photo_limit';
}
