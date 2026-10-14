import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type ObjectStorageConfig = {
  bucket: string;
  publicBaseUrl: string;
  client: S3Client;
};

export function getObjectStorageConfig(): ObjectStorageConfig | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, '');
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const region = process.env.S3_REGION?.trim() ?? 'auto';

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return null;
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(endpoint),
    ...(endpoint ? { endpoint } : {}),
  });

  return { bucket, publicBaseUrl, client };
}

export async function uploadPublicObject(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const cfg = getObjectStorageConfig();
  if (!cfg) {
    throw new Error('object_storage_not_configured');
  }

  await cfg.client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );

  return `${cfg.publicBaseUrl}/${opts.key}`;
}

/** Stream object bytes from R2/S3 (for /uploads proxy — RN Image often fails on 302 to R2). */
export async function getPublicObject(
  key: string,
): Promise<{ body: NodeJS.ReadableStream; contentType: string } | null> {
  const cfg = getObjectStorageConfig();
  if (!cfg) return null;
  try {
    const res = await cfg.client.send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    );
    if (!res.Body) return null;
    const contentType = res.ContentType ?? 'application/octet-stream';
    return { body: res.Body as NodeJS.ReadableStream, contentType };
  } catch {
    return null;
  }
}
