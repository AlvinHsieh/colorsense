import { beforeEach, describe, expect, it, vi } from 'vitest';

const browserMock = vi.hoisted(() => ({
  tabs: { query: vi.fn() },
  scripting: { executeScript: vi.fn() },
}));

vi.mock('wxt/browser', () => ({ browser: browserMock }));

import { scanActiveTab } from './run-scan';

describe('scanActiveTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000012');
    browserMock.tabs.query.mockResolvedValue([{ id: 42 }]);
  });

  it('returns a validated scan from the active tab', async () => {
    browserMock.scripting.executeScript.mockResolvedValue([
      {
        result: {
          scanId: '00000000-0000-4000-8000-000000000012',
          truncated: false,
          unsupportedColorValues: 0,
          elements: [
            {
              ref: '00000000-0000-4000-8000-000000000012:1',
              tagName: 'div',
              colors: [
                {
                  property: 'text',
                  color: { red: 1, green: 2, blue: 3, alpha: 1, css: 'rgba(1, 2, 3, 1)' },
                },
              ],
            },
          ],
        },
      },
    ]);

    const result = await scanActiveTab(100);

    expect(result.elements).toHaveLength(1);
    expect(browserMock.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 42 }, args: [result.scanId, 100] }),
    );
  });

  it('rejects missing tabs, invalid limits, and untrusted page results', async () => {
    await expect(scanActiveTab(0)).rejects.toThrow(RangeError);

    browserMock.tabs.query.mockResolvedValueOnce([]);
    await expect(scanActiveTab()).rejects.toThrow('No active browser tab');

    browserMock.scripting.executeScript.mockResolvedValueOnce([{ result: { scanId: 'forged' } }]);
    await expect(scanActiveTab()).rejects.toThrow('invalid color scan result');
  });
});
