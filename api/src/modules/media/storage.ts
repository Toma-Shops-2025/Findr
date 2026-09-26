import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

/** Local disk root for MVP uploads. Play Store should switch to S3/CDN later. */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

/** Photos: 8MB. Short videos: 25MB / 30s (client enforces duration; server enforces size). */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const VIDEO_MAX_DURATION_MS = 30_000;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm']);

export type MediaType = 'photo' | 'video';
export type UploadKind = 'profile' | 'chat' | 'album';

export function ensureUploadsDir(): void {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  for (const sub of ['profiles', 'chat', 'album', 'videos']) {
    const dir = join(UPLOADS_DIR, sub);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

export function detectMediaType(
  mimetype: string | undefined,
  filename: string | undefined,
): MediaType | null {
  const mime = (mimetype ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  const ext = filename ? extname(filename).toLowerCase() : '';
  if (IMAGE_EXT.has(ext)) return 'photo';
  if (VIDEO_EXT.has(ext)) return 'video';
  return null;
}

function safeExt(
  mediaType: MediaType,
  filename: string | undefined,
  mimetype: string | undefined,
): string {
  const fromName = filename ? extname(filename).toLowerCase() : '';
  if (mediaType === 'photo') {
    if (IMAGE_EXT.has(fromName)) return fromName === '.jpeg' ? '.jpg' : fromName;
    if (mimetype === 'image/png') return '.png';
    if (mimetype === 'image/webp') return '.webp';
    if (mimetype === 'image/gif') return '.gif';
    return '.jpg';
  }
  if (VIDEO_EXT.has(fromName)) return fromName;
  if (mimetype === 'video/webm') return '.webm';
  if (mimetype === 'video/quicktime') return '.mov';
  return '.mp4';
}

export type SavedUpload = {
  relativeUrl: string;
  absolutePath: string;
  bytes: number;
  mediaType: MediaType;
};

export async function saveUploadStream(opts: {
  kind: UploadKind;
  mediaType: MediaType;
  stream: Readable;
  filename?: string;
  mimetype?: string;
}): Promise<SavedUpload> {
  ensureUploadsDir();
  const maxBytes =
    opts.mediaType === 'video' ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES;
  const ext = safeExt(opts.mediaType, opts.filename, opts.mimetype);
  const sub =
    opts.mediaType === 'video'
      ? 'videos'
      : opts.kind === 'profile'
        ? 'profiles'
        : opts.kind === 'album'
          ? 'album'
          : 'chat';
  const name = `${randomUUID()}${ext}`;
  const absolutePath = join(UPLOADS_DIR, sub, name);
  const relativeUrl = `/uploads/${sub}/${name}`;

  let bytes = 0;
  opts.stream.on('data', (chunk: Buffer | string) => {
    bytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
    if (bytes > maxBytes) {
      opts.stream.destroy(new Error('file_too_large'));
    }
  });

  await pipeline(opts.stream, createWriteStream(absolutePath));
  if (bytes > maxBytes) {
    throw Object.assign(new Error('file_too_large'), { code: 'file_too_large' });
  }

  return { relativeUrl, absolutePath, bytes, mediaType: opts.mediaType };
}

export function isAllowedUploadUrl(url: string): boolean {
  return (
    url.startsWith('/uploads/') ||
    url.startsWith('stub:') ||
    url.startsWith('https://') ||
    url.startsWith('http://')
  );
}

/** @deprecated use PHOTO_MAX_BYTES - kept for older imports */
export const MEDIA_MAX_BYTES = PHOTO_MAX_BYTES;
