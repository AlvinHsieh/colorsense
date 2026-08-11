import { browser } from 'wxt/browser';

import { isLocalePreference, type LocalePreference } from './messages';

const LOCALE_PREFERENCE_KEY = 'localePreference';

export async function loadLocalePreference(): Promise<LocalePreference> {
  const stored = await browser.storage.local.get(LOCALE_PREFERENCE_KEY);
  return isLocalePreference(stored[LOCALE_PREFERENCE_KEY]) ? stored[LOCALE_PREFERENCE_KEY] : 'auto';
}

export async function saveLocalePreference(preference: LocalePreference): Promise<void> {
  await browser.storage.local.set({ [LOCALE_PREFERENCE_KEY]: preference });
}
