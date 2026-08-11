export type MessageSource = 'background' | 'page';

export interface PingMessage {
  type: 'PING';
  requestId: string;
}

export interface PongMessage {
  type: 'PONG';
  requestId: string;
  source: MessageSource;
  version: string;
}

export type RuntimeMessage = PingMessage | PongMessage;

export function createPingMessage(requestId: string): PingMessage {
  if (requestId.length === 0) {
    throw new Error('A runtime request ID is required.');
  }

  return { type: 'PING', requestId };
}

export function createPongMessage(
  requestId: string,
  source: MessageSource,
  version: string,
): PongMessage {
  if (requestId.length === 0 || version.length === 0) {
    throw new Error('A runtime request ID and extension version are required.');
  }

  return { type: 'PONG', requestId, source, version };
}

export function isPingMessage(value: unknown): value is PingMessage {
  if (!isRecord(value)) {
    return false;
  }

  return value.type === 'PING' && typeof value.requestId === 'string' && value.requestId.length > 0;
}

export function isPongMessage(value: unknown, source?: MessageSource): value is PongMessage {
  if (!isRecord(value)) {
    return false;
  }

  const isValid =
    value.type === 'PONG' &&
    typeof value.requestId === 'string' &&
    value.requestId.length > 0 &&
    (value.source === 'background' || value.source === 'page') &&
    typeof value.version === 'string' &&
    value.version.length > 0;

  return isValid && (source === undefined || value.source === source);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
