import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  getObjectStorageConfig,
  uploadPublicObject,
} from './objectStorage.js';

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
  /** Public URL (absolute https or /uploads/...). */
  relativeUrl: string;
  absolutePath: string;
  bytes: number;
  mediaType: MediaType;
};

async function streamToBuffer(
  stream: Readable,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buf.length;
    if (bytes > maxBytes) {
      throw Object.assign(new Error('file_too_large'), { code: 'file_too_large' });
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function contentTypeFor(
  mediaType: MediaType,
  mimetype: string | undefined,
  ext: string,
): string {
  if (mimetype) return mimetype;
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (mediaType === 'video') return 'video/mp4';
  return 'image/jpeg';
}

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
  const localUrl = `/uploads/${sub}/${name}`;

  const body = await streamToBuffer(opts.stream, maxBytes);
  const bytes = body.length;
  const contentType = contentTypeFor(opts.mediaType, opts.mimetype, ext);

  if (getObjectStorageConfig()) {
    const key = `findr/${sub}/${name}`;
    const publicUrl = await uploadPublicObject({
      key,
      body,
      contentType,
    });
    return {
      relativeUrl: publicUrl,
      absolutePath,
      bytes,
      mediaType: opts.mediaType,
    };
  }

  ensureUploadsDir();
  writeFileSync(absolutePath, body);
  return {
    relativeUrl: localUrl,
    absolutePath,
    bytes,
    mediaType: opts.mediaType,
  };
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
