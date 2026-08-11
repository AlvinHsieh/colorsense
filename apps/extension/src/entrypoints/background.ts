import { browser } from 'wxt/browser';

import { createPongMessage, isPingMessage } from '../lib/messages';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isPingMessage(message)) {
      return undefined;
    }

    return Promise.resolve(
      createPongMessage(message.requestId, 'background', browser.runtime.getManifest().version),
    );
  });
});
