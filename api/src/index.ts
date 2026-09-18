import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { geoRoutes } from './routes/geo.js';
import { chatRoutes } from './routes/chat.js';
import { safetyRoutes } from './routes/safety.js';
import { getUserStore } from './modules/auth/userStore.js';

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

async function main() {
  // Warm auth store (memory or Postgres) before accepting traffic.
  await getUserStore();

  const app = Fastify({
    logger: true,
  });

  await app.register(cors, { origin: true });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(profileRoutes, { prefix: '/profiles' });
  await app.register(geoRoutes, { prefix: '/geo' });
  await app.register(chatRoutes, { prefix: '/chat' });
  await app.register(safetyRoutes, { prefix: '/safety' });

  await app.listen({ port, host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
