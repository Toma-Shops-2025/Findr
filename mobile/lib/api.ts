import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

import {
  PHOTO_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from '@/lib/mediaLimits';

/**
 * API base URL for the Findr backend.
 * On a physical Galaxy S9, use your PC's LAN IP -- not localhost.
 * Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');

  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  if (extra?.apiUrl) return extra.apiUrl.replace(/\/$/, '');

  return 'https://api.myfindr.fun';
}

export type ApiError = {
  error: string;
  message?: string;
};

const DEFAULT_FETCH_TIMEOUT_MS = 45_000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit & {
    token?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const { token, headers, body, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...rest } =
    options;
  const hdrs: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // Fastify rejects DELETE/GET with application/json and an empty body.
  if (body !== undefined && body !== null && body !== '') {
    hdrs['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      body,
      signal: controller.signal,
      headers: {
        ...hdrs,
        ...(headers as Record<string, string> | undefined),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Request timed out. Check your connection or try again in a moment.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    const err = new Error(data.message ?? data.error ?? `http_${res.status}`);
    (err as Error & { status?: number; code?: string }).status = res.status;
    (err as Error & { status?: number; code?: string }).code = data.error;
    throw err;
  }
  return data;
}

export type UploadKind = 'profile' | 'chat' | 'album';
export type UploadSource = 'upload' | 'chat' | 'camera' | 'profile' | 'album';
export type MediaType = 'photo' | 'video';

export type UploadResult = {
  url: string;
  kind: UploadKind;
  mediaType: MediaType;
  bytes: number;
  durationMs?: number | null;
  albumId?: string;
};

export type AlbumItem = {
  id: string;
  userId: string;
  mediaType: MediaType;
  url: string;
  mime: string | null;
  bytes: number | null;
  durationMs: number | null;
  source: UploadSource;
  createdAt: string;
};

function guessImageMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function guessVideoMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
}

function extForMedia(mediaType: MediaType, name: string): string {
  const lower = name.toLowerCase();
  if (mediaType === 'photo') {
    if (lower.endsWith('.png')) return '.png';
    if (lower.endsWith('.webp')) return '.webp';
    return '.jpg';
  }
  if (lower.endsWith('.mov')) return '.mov';
  if (lower.endsWith('.webm')) return '.webm';
  return '.mp4';
}

/**
 * Photo / short video upload (profile / chat / album).
 * SDK 57: use expo-file-system/legacy uploadAsync -- do NOT append RN
 * { uri, name, type } into FormData + fetch (Unsupported FormDataPart).
 */
export async function apiUploadMedia(
  localUri: string,
  opts: {
    token: string;
    kind: UploadKind;
    mediaType: MediaType;
    fileName?: string;
    source?: UploadSource;
    durationMs?: number | null;
  },
): Promise<UploadResult> {
  const isVideo = opts.mediaType === 'video';
  const defaultName = isVideo ? 'clip.mp4' : 'photo.jpg';
  const name = opts.fileName ?? localUri.split('/').pop() ?? defaultName;
  const type = isVideo ? guessVideoMime(name) : guessImageMime(name);
  const maxBytes = isVideo ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES;

  let fileUri = localUri;
  if (fileUri.startsWith('content://')) {
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) {
      throw new Error('No cache directory for upload');
    }
    const dest = `${base}findr-upload-${Date.now()}${extForMedia(opts.mediaType, name)}`;
    await FileSystem.copyAsync({ from: fileUri, to: dest });
    fileUri = dest;
  }

  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists && 'size' in info && typeof info.size === 'number') {
    if (info.size > maxBytes) {
      throw new Error(
        `File too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`,
      );
    }
  }

  const url = `${getApiBaseUrl()}/media/upload?kind=${encodeURIComponent(opts.kind)}`;
  const parameters: Record<string, string> = {
    kind: opts.kind,
    source: opts.source ?? (opts.kind === 'chat' ? 'chat' : opts.kind),
  };
  if (isVideo && opts.durationMs != null && opts.durationMs > 0) {
    parameters.durationMs = String(Math.trunc(opts.durationMs));
  }

  const upload = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: type,
    parameters,
    headers: {
      Authorization: `Bearer ${opts.token}`,
    },
  });

  let data: UploadResult & ApiError;
  try {
    data = JSON.parse(upload.body || '{}') as UploadResult & ApiError;
  } catch {
    data = {
      error: 'invalid_json',
      url: '',
      kind: opts.kind,
      mediaType: 'photo',
      bytes: 0,
    };
  }

  if (upload.status < 200 || upload.status >= 300) {
    const err = new Error(
      data.message ?? data.error ?? `http_${upload.status}`,
    );
    (err as Error & { status?: number; code?: string }).status = upload.status;
    (err as Error & { status?: number; code?: string }).code = data.error;
    throw err;
  }

  if (!data.url) {
    throw new Error(data.message ?? data.error ?? 'upload_missing_url');
  }
  return data;
}

/** Profile / image helper -- photo path. */
export async function apiUploadImage(
  localUri: string,
  opts: { token: string; kind: UploadKind; fileName?: string },
): Promise<UploadResult> {
  return apiUploadMedia(localUri, {
    ...opts,
    mediaType: 'photo',
    source: opts.kind === 'chat' ? 'chat' : opts.kind,
  });
}

/** Stage 2d: list personal Findr album (newest first). */
export async function apiListAlbum(
  token: string,
  limit = 100,
): Promise<AlbumItem[]> {
  const data = await apiFetch<{ items: AlbumItem[] }>(
    `/media/album?limit=${encodeURIComponent(String(limit))}`,
    { token },
  );
  return data.items ?? [];
}

/** Stage 2d: delete one album item owned by the current user. */
export async function apiDeleteAlbumItem(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch(`/media/album/${id}`, {
    method: 'DELETE',
    token,
  });
}
