import type { FastifyPluginAsync } from 'fastify';

/**
 * Coarse location + nearby stubs.
 * TODO: PostGIS ST_DWithin; store fuzzed coords only (~100–500m).
 */
export const geoRoutes: FastifyPluginAsync = async (app) => {
  app.post('/location', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: accept consented location, fuzz, upsert into user_locations',
    });
  });

  app.get('/nearby', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: nearby grid query with distance bands (never exact pin)',
      results: [],
    });
  });
};
