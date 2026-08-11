import { beforeEach, describe, expect, it, vi } from 'vitest';

const browserMock = vi.hoisted(() => ({
  tabs: { query: vi.fn() },
  scripting: { executeScript: vi.fn() },
}));

vi.mock('wxt/browser', () => ({ browser: browserMock }));

import { applyOverlayToActiveTab, removeAllOverlaysFromActiveTab } from './run-overlay';

describe('overlay active-tab runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMock.tabs.query.mockResolvedValue([{ id: 14 }]);
  });

  it('validates an apply result from the active page', async () => {
    browserMock.scripting.executeScript.mockResolvedValue([
      { result: { elementRef: 'target', status: 'applied' } },
    ]);

    await expect(
      applyOverlayToActiveTab(
        {
          elementRef: 'target',
          candidateType: 'status',
          evidence: ['status-keyword'],
          confidence: 'medium',
          confidenceScore: 0.7,
          disposition: 'color-only-candidate',
          reviewRequired: true,
          semantic: 'error',
        },
        'Error',
      ),
    ).resolves.toEqual({ elementRef: 'target', status: 'applied' });

    expect(browserMock.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ args: [expect.any(Object), 'Error'] }),
    );
  });

  it('validates page undo and rejects malformed results', async () => {
    browserMock.scripting.executeScript.mockResolvedValueOnce([
      { result: { removed: 2, missingTargets: 0 } },
    ]);
    await expect(removeAllOverlaysFromActiveTab()).resolves.toEqual({
      removed: 2,
      missingTargets: 0,
    });

    browserMock.scripting.executeScript.mockResolvedValueOnce([{ result: { removed: -1 } }]);
    await expect(removeAllOverlaysFromActiveTab()).rejects.toThrow('invalid overlay result');
  });

  it('handles missing active tabs', async () => {
    browserMock.tabs.query.mockResolvedValue([]);

    await expect(removeAllOverlaysFromActiveTab()).rejects.toThrow('No active browser tab');
  });
});
