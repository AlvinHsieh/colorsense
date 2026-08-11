import { createPingMessage, createPongMessage, isPingMessage, isPongMessage } from './messages';

describe('runtime messages', () => {
  it('creates and validates a PING message', () => {
    const message = createPingMessage('request-1');

    expect(message).toEqual({ type: 'PING', requestId: 'request-1' });
    expect(isPingMessage(message)).toBe(true);
    expect(isPingMessage({ type: 'PING', requestId: '' })).toBe(false);
  });

  it('creates and validates a source-specific PONG message', () => {
    const message = createPongMessage('request-1', 'background', '0.1.0');

    expect(isPongMessage(message, 'background')).toBe(true);
    expect(isPongMessage(message, 'page')).toBe(false);
    expect(isPongMessage({ ...message, version: '' })).toBe(false);
  });

  it('rejects empty required fields', () => {
    expect(() => createPingMessage('')).toThrow('request ID');
    expect(() => createPongMessage('request-1', 'page', '')).toThrow('extension version');
  });
});
