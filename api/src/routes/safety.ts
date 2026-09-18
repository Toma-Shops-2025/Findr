import type { FastifyPluginAsync } from 'fastify';

/** Block / report stubs — safety is a day-one product requirement. */
export const safetyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/block', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: create block; hide from grid + chat both ways',
    });
  });

  app.post('/report', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: create report with reason + evidence snapshot for admin queue',
    });
  });
};
