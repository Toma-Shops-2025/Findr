import type { FastifyPluginAsync } from 'fastify';

/** Profile CRUD stubs — inclusive identity / intent fields. */
export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: return current user profile',
    });
  });

  app.put('/me', async (_req, reply) => {
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: update display name, bio, photos, gender, orientations, looking-for',
    });
  });
};
