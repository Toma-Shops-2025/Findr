import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { uploadsRoutes } from './routes/uploads.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { geoRoutes } from './routes/geo.js';
import { chatRoutes } from './routes/chat.js';
import { safetyRoutes } from './routes/safety.js';
import { mediaRoutes } from './routes/media.js';
import { adminRoutes } from './routes/admin.js';
import { deviceRoutes } from './routes/devices.js';
import { realtimeRoutes } from './routes/realtime.js';
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

  await app.register(uploadsRoutes);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(profileRoutes, { prefix: '/profiles' });
  await app.register(geoRoutes, { prefix: '/geo' });
  await app.register(chatRoutes, { prefix: '/chat' });
  await app.register(safetyRoutes, { prefix: '/safety' });
  await app.register(mediaRoutes, { prefix: '/media' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(deviceRoutes, { prefix: '/devices' });
  await app.register(realtimeRoutes, { prefix: '/realtime' });

  await app.listen({ port, host });
  const storageMode = process.env.S3_BUCKET ? 'S3/R2 + local fallback path' : 'local disk only';
  app.log.info(`Media storage: ${storageMode}; uploads dir ${UPLOADS_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
