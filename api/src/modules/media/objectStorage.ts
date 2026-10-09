import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(endpoint),
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
