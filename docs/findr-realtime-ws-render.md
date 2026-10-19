# WebSocket on Render

The API exposes realtime at:

- Health: `GET /realtime/health` → `{ ok: true, wsPath: "/realtime/ws" }`
- Socket: `wss://<api-host>/realtime/ws?token=<JWT>`

Mobile builds the URL with `realtimeWebSocketUrl()` in `mobile/lib/realtime.ts` (HTTPS → WSS).

If production returns **404** on `/realtime/ws`, chat still works via HTTP polling in `mobile/app/chat/[id].tsx`. Fix Render routing or confirm the `realtime` plugin is registered on the deployed API revision before enabling WS-only UX.
