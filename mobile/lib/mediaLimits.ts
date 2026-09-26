/** Findr media limits (keep in sync with api/src/modules/media/storage.ts). */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SEC = 30;
export const VIDEO_MAX_DURATION_MS = VIDEO_MAX_DURATION_SEC * 1000;

/**
 * Privacy: Findr never writes captures to the device Photos/Gallery/Camera Roll.
 * Camera + picker output stays in the app sandbox, then uploads to Findr album/API.
 * Do NOT call MediaLibrary.createAssetAsync / saveToLibraryAsync.
 */
export const FINDR_MEDIA_STAYS_IN_APP = true;
