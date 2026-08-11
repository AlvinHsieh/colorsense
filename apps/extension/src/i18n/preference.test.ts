import { beforeEach, describe, expect, it, vi } from 'vitest';

const browserMock = vi.hoisted(() => ({
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
}));

vi.mock('wxt/browser', () => ({ browser: browserMock }));

import { loadLocalePreference, saveLocalePreference } from './preference';

describe('locale preference storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMock.storage.local.set.mockResolvedValue(undefined);
  });

  it('loads a valid preference and falls back for untrusted stored values', async () => {
    browserMock.storage.local.get.mockResolvedValueOnce({ localePreference: 'zh-TW' });
    await expect(loadLocalePreference()).resolves.toBe('zh-TW');

    browserMock.storage.local.get.mockResolvedValueOnce({ localePreference: 'remote-locale' });
    await expect(loadLocalePreference()).resolves.toBe('auto');
  });

  it('persists only the selected local preference', async () => {
    await saveLocalePreference('en');
    expect(browserMock.storage.local.set).toHaveBeenCalledWith({ localePreference: 'en' });
  });
});
