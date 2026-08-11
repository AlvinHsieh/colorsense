import { describe, expect, it } from 'vitest';

import { MESSAGES, isLocalePreference, resolveLocale } from './messages';

describe('locale messages', () => {
  it('resolves explicit and supported browser locales deterministically', () => {
    expect(resolveLocale('zh-TW', ['en-US'])).toBe('zh-TW');
    expect(resolveLocale('auto', ['zh-Hant-TW', 'en-US'])).toBe('zh-TW');
    expect(resolveLocale('auto', ['zh-HK'])).toBe('zh-TW');
    expect(resolveLocale('auto', ['en-GB'])).toBe('en');
    expect(resolveLocale('auto', ['fr-FR'])).toBe('en');
  });

  it('rejects unsupported persisted preferences', () => {
    expect(isLocalePreference('auto')).toBe(true);
    expect(isLocalePreference('zh-TW')).toBe(true);
    expect(isLocalePreference('zh-CN')).toBe(false);
    expect(isLocalePreference(null)).toBe(false);
  });

  it('uses correct English plurals and count-neutral Traditional Chinese copy', () => {
    expect(MESSAGES.en.findingCount(1)).toBe('1 reviewable finding');
    expect(MESSAGES.en.findingCount(2)).toBe('2 reviewable findings');
    expect(MESSAGES['zh-TW'].findingCount(2)).toBe('2 個待檢視項目');
  });
});
