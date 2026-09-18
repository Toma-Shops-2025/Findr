import type { FastifyPluginAsync } from 'fastify';

/**
 * Chat adapter stubs.
 * TODO: buy-vs-build — Stream Chat / Ably / Firebase; mint short-lived tokens.
 */
export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post('/token', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: issue chat vendor token for current user',
    });
  });

  app.get('/threads', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: list threads (respect blocks)',
      threads: [],
    });
  });
};
