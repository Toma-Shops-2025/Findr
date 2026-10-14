import type { WebSocket } from 'ws';

export type RealtimeEvent =
  | { type: 'message.new'; conversationId: string; message: unknown }
  | { type: 'typing'; conversationId: string; userId: string; active: boolean }
  | { type: 'hello.new'; conversationId: string; fromUserId: string };

type Client = {
  userId: string;
  socket: WebSocket;
  conversations: Set<string>;
};

const clientsByUser = new Map<string, Set<Client>>();

function addClient(userId: string, client: Client) {
  let set = clientsByUser.get(userId);
  if (!set) {
    set = new Set();
    clientsByUser.set(userId, set);
  }
  set.add(client);
}

function removeClient(userId: string, client: Client) {
  const set = clientsByUser.get(userId);
  if (!set) return;
  set.delete(client);
  if (set.size === 0) clientsByUser.delete(userId);
}

export function registerRealtimeClient(userId: string, socket: WebSocket): void {
  const client: Client = { userId, socket, conversations: new Set() };
  addClient(userId, client);

  socket.on('close', () => removeClient(userId, client));
  socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const data = JSON.parse(String(raw)) as {
        type?: string;
        conversationId?: string;
        active?: boolean;
      };
      if (data.type === 'subscribe' && data.conversationId) {
        client.conversations.add(data.conversationId);
      }
      if (data.type === 'typing' && data.conversationId) {
        broadcastTyping(
          data.conversationId,
          userId,
          Boolean(data.active),
          userId,
        );
      }
    } catch {
      // ignore malformed client frames
    }
  });
}

function send(socket: WebSocket, event: RealtimeEvent) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(event));
}

export function broadcastToUser(userId: string, event: RealtimeEvent): void {
  const set = clientsByUser.get(userId);
  if (!set) return;
  for (const client of set) {
    send(client.socket, event);
  }
}

export function broadcastToConversation(
  conversationId: string,
  event: RealtimeEvent,
  exceptUserId?: string,
): void {
  for (const [userId, set] of clientsByUser) {
    if (exceptUserId && userId === exceptUserId) continue;
    for (const client of set) {
      if (!client.conversations.has(conversationId)) continue;
      send(client.socket, event);
    }
  }
}

function broadcastTyping(
  conversationId: string,
  fromUserId: string,
  active: boolean,
  exceptUserId: string,
) {
  broadcastToConversation(
    conversationId,
    { type: 'typing', conversationId, userId: fromUserId, active },
    exceptUserId,
  );
}

export function publishMessage(
  conversationId: string,
  peerUserIds: string[],
  message: unknown,
  senderId: string,
): void {
  const event: RealtimeEvent = {
    type: 'message.new',
    conversationId,
    message,
  };
  for (const uid of peerUserIds) {
    if (uid === senderId) continue;
    broadcastToUser(uid, event);
  }
  broadcastToConversation(conversationId, event, senderId);
}
