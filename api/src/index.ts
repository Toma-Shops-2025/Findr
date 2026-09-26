import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';

import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { geoRoutes } from './routes/geo.js';
import { chatRoutes } from './routes/chat.js';
import { safetyRoutes } from './routes/safety.js';
import { mediaRoutes } from './routes/media.js';
import { getUserStore } from './modules/auth/userStore.js';
import { ensureUploadsDir, UPLOADS_DIR } from './modules/media/storage.js';

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

async function main() {
  // Warm auth store (memory or Postgres) before accepting traffic.
  await getUserStore();
  ensureUploadsDir();

  const app = Fastify({
    logger: true,
  });

  await app.register(cors, { origin: true });

  // Serve local MVP uploads under /uploads/…
  // Render disk is ephemeral unless a Persistent Disk is mounted.
  // Play Store should use S3/CDN instead.
  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(profileRoutes, { prefix: '/profiles' });
  await app.register(geoRoutes, { prefix: '/geo' });
  await app.register(chatRoutes, { prefix: '/chat' });
  await app.register(safetyRoutes, { prefix: '/safety' });
  await app.register(mediaRoutes, { prefix: '/media' });

  await app.listen({ port, host });
  app.log.info(`Uploads dir: ${UPLOADS_DIR} (local MVP; use S3 for Play Store)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
