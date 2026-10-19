import type { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';

import { verifyAccessToken } from '../modules/auth/jwt.js';
import { registerRealtimeClient } from '../modules/realtime/hub.js';

export const realtimeRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  app.get('/health', async () => ({
    ok: true,
    wsPath: '/realtime/ws',
  }));

  app.get('/ws', { websocket: true }, (socket, req) => {
    const token =
      (req.query as { token?: string }).token ??
      (typeof req.headers.authorization === 'string'
        ? req.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);

    if (!token) {
      socket.close(4001, 'auth_required');
      return;
    }

    void (async () => {
      try {
        const payload = await verifyAccessToken(token);
        if (!payload) {
          socket.close(4003, 'invalid_token');
          return;
        }
        registerRealtimeClient(payload.sub, socket);
        socket.send(JSON.stringify({ type: 'connected', userId: payload.sub }));
      } catch {
        socket.close(4003, 'invalid_token');
      }
    })();
  });
};
