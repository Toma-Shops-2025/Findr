import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

import {
  PHOTO_MAX_BYTES,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_MS,
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

  return 'http://localhost:4000';
}

export type ApiError = {
  error: string;
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

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

function guessMime(name: string, mediaType: MediaType): string {
  const lower = name.toLowerCase();
  if (mediaType === 'video') {
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
  }
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Multipart upload (JWT) via expo-file-system/legacy uploadAsync.
 * SDK 57: do NOT append RN { uri, name, type } into FormData + fetch.
 *
 * Privacy: uploads from app-sandbox URIs only. Never saves to device gallery.
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
  const name =
    opts.fileName ??
    localUri.split('/').pop() ??
    (opts.mediaType === 'video' ? 'clip.mp4' : 'photo.jpg');
  const type = guessMime(name, opts.mediaType);

  if (opts.mediaType === 'video' && opts.durationMs != null) {
    if (opts.durationMs > VIDEO_MAX_DURATION_MS) {
      throw new Error(`Video must be ${VIDEO_MAX_DURATION_MS / 1000}s or less`);
    }
  }

  let fileUri = localUri;
  // uploadAsync on Android prefers file://; copy content:// into cache first.
  // Copy stays in app sandbox -- never MediaLibrary / Camera Roll.
  if (fileUri.startsWith('content://')) {
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) {
      throw new Error('No cache directory for media upload');
    }
    const ext = opts.mediaType === 'video' ? 'mp4' : 'jpg';
    const dest = `${base}findr-upload-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: fileUri, to: dest });
    fileUri = dest;
  }

  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists && 'size' in info && typeof info.size === 'number') {
    const max =
      opts.mediaType === 'video' ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES;
    if (info.size > max) {
      throw new Error(
        `File too large (max ${Math.round(max / (1024 * 1024))}MB)`,
      );
    }
  }

  const url = `${getApiBaseUrl()}/media/upload?kind=${encodeURIComponent(opts.kind)}`;
  const parameters: Record<string, string> = {
    kind: opts.kind,
    source: opts.source ?? (opts.kind === 'chat' ? 'chat' : opts.kind),
  };
  if (opts.durationMs != null && opts.durationMs > 0) {
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
      mediaType: opts.mediaType,
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

/** @deprecated prefer apiUploadMedia */
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

export async function apiListAlbum(
  token: string,
  limit = 100,
): Promise<AlbumItem[]> {
  const data = await apiFetch<{ items: AlbumItem[] }>(
    `/media/album?limit=${limit}`,
    { token },
  );
  return data.items ?? [];
}

export async function apiDeleteAlbumItem(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch(`/media/album/${id}`, { method: 'DELETE', token });
}
