import type { PongMessage } from './messages';

export function pagePing(requestId: string, version: string): PongMessage {
  return {
    type: 'PONG',
    requestId,
    source: 'page',
    version,
  };
}
