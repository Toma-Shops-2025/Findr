import { getApiBaseUrl } from '@/lib/api';

type RealtimeHandlers = {
  onMessage?: (conversationId: string, message: unknown) => void;
  onTyping?: (conversationId: string, userId: string, active: boolean) => void;
};

export function realtimeWebSocketUrl(): string {
  const http = getApiBaseUrl();
  const ws = http
    .replace(/^https:\/\//i, 'wss://')
    .replace(/^http:\/\//i, 'ws://');
  return `${ws}/realtime/ws`;
}

export class FindrRealtime {
  private socket: WebSocket | null = null;
  private handlers: RealtimeHandlers = {};
  private token: string | null = null;

  connect(accessToken: string, handlers: RealtimeHandlers) {
    this.token = accessToken;
    this.handlers = handlers;
    this.open();
  }

  private open() {
    if (!this.token) return;
    const url = `${realtimeWebSocketUrl()}?token=${encodeURIComponent(this.token)}`;
    this.socket?.close();
    const ws = new WebSocket(url);
    this.socket = ws;
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as {
          type?: string;
          conversationId?: string;
          message?: unknown;
          userId?: string;
          active?: boolean;
        };
        if (data.type === 'message.new' && data.conversationId) {
          this.handlers.onMessage?.(data.conversationId, data.message);
        }
        if (
          data.type === 'typing' &&
          data.conversationId &&
          data.userId != null
        ) {
          this.handlers.onTyping?.(
            data.conversationId,
            data.userId,
            Boolean(data.active),
          );
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      if (this.token) {
        setTimeout(() => this.open(), 2500);
      }
    };
  }

  subscribe(conversationId: string) {
    this.send({ type: 'subscribe', conversationId });
  }

  sendTyping(conversationId: string, active: boolean) {
    this.send({ type: 'typing', conversationId, active });
  }

  private send(payload: object) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  disconnect() {
    this.token = null;
    this.socket?.close();
    this.socket = null;
  }
}
