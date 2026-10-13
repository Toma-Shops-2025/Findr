import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { getObjectStorageConfig } from '../modules/media/objectStorage.js';
import { UPLOADS_DIR } from '../modules/media/storage.js';

/**
 * Serve uploaded media from local disk when present; otherwise redirect to R2 public URL.
 * Mobile always uses https://api…/uploads/… so Image/Video do not depend on R2 hostname quirks.
 */
function mimeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'image/jpeg';
}

export const uploadsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/uploads/*', async (req, reply) => {
    const rel = String((req.params as { '*': string })['*'] ?? '').replace(
      /^\/+/,
      '',
    );
    if (!rel || rel.includes('..')) {
      return reply.code(400).send({ error: 'invalid_path' });
    }

    const localPath = join(UPLOADS_DIR, rel);
    if (existsSync(localPath)) {
      const mime = mimeForPath(localPath);
      return reply.type(mime).send(createReadStream(localPath));
    }

    const cfg = getObjectStorageConfig();
    if (cfg) {
      const key = `findr/${rel}`;
      return reply.redirect(`${cfg.publicBaseUrl}/${key}`);
    }

    return reply.code(404).send({ error: 'not_found' });
  });
};
