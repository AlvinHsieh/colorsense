import { pagePing } from './page-probe';

describe('pagePing', () => {
  it('returns only the typed local handshake fields', () => {
    expect(pagePing('request-1', '0.1.0')).toEqual({
      type: 'PONG',
      requestId: 'request-1',
      source: 'page',
      version: '0.1.0',
    });
  });
});
