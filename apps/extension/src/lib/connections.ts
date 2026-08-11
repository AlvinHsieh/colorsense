import { browser } from 'wxt/browser';

import { createPingMessage, isPongMessage, type MessageSource, type PongMessage } from './messages';
import { pagePing } from './page-probe';

export interface ConnectionResult {
  source: MessageSource;
  status: 'ready' | 'unavailable';
  version?: string;
  reason?: string;
}

export interface ConnectionReport {
  background: ConnectionResult;
  page: ConnectionResult;
}

export async function checkConnections(): Promise<ConnectionReport> {
  const requestId = crypto.randomUUID();
  const version = browser.runtime.getManifest().version;

  const background = await checkBackground(requestId);
  const page = await checkPage(requestId, version);

  return { background, page };
}

async function checkBackground(requestId: string): Promise<ConnectionResult> {
  try {
    const response: unknown = await browser.runtime.sendMessage(createPingMessage(requestId));
    return toConnectionResult(response, requestId, 'background');
  } catch (error: unknown) {
    return unavailable('background', readableReason(error));
  }
}

async function checkPage(requestId: string, version: string): Promise<ConnectionResult> {
  try {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id === undefined) {
      return unavailable('page', 'No active browser tab is available.');
    }

    const injectionResults = await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: pagePing,
      args: [requestId, version],
    });
    const response: unknown = injectionResults[0]?.result;
    return toConnectionResult(response, requestId, 'page');
  } catch (error: unknown) {
    return unavailable('page', readableReason(error));
  }
}

function toConnectionResult(
  response: unknown,
  requestId: string,
  source: MessageSource,
): ConnectionResult {
  if (!isPongMessage(response, source) || response.requestId !== requestId) {
    return unavailable(source, 'The extension received an invalid handshake response.');
  }

  return ready(response);
}

function ready(response: PongMessage): ConnectionResult {
  return {
    source: response.source,
    status: 'ready',
    version: response.version,
  };
}

function unavailable(source: MessageSource, reason: string): ConnectionResult {
  return { source, status: 'unavailable', reason };
}

function readableReason(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return 'The browser rejected the connection check.';
}
