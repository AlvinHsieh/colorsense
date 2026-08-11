import { browser } from 'wxt/browser';

import { scanDocument } from './scan-document';
import { COLOR_PROPERTIES, type DocumentColorScan, type NormalizedColor } from './types';

const DEFAULT_MAX_ELEMENTS = 2_000;
const MAX_ELEMENTS_LIMIT = 5_000;

export async function scanActiveTab(
  maxElements = DEFAULT_MAX_ELEMENTS,
): Promise<DocumentColorScan> {
  if (!Number.isInteger(maxElements) || maxElements < 1 || maxElements > MAX_ELEMENTS_LIMIT) {
    throw new RangeError(`maxElements must be an integer between 1 and ${MAX_ELEMENTS_LIMIT}.`);
  }

  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id === undefined) {
    throw new Error('No active browser tab is available for scanning.');
  }

  const scanId = crypto.randomUUID();
  const injectionResults = await browser.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: scanDocument,
    args: [scanId, maxElements],
  });
  const result: unknown = injectionResults[0]?.result;

  if (!isDocumentColorScan(result, scanId)) {
    throw new Error('The page returned an invalid color scan result.');
  }

  return result;
}

function isDocumentColorScan(value: unknown, expectedScanId: string): value is DocumentColorScan {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.scanId === expectedScanId &&
    typeof value.truncated === 'boolean' &&
    Number.isInteger(value.unsupportedColorValues) &&
    Number(value.unsupportedColorValues) >= 0 &&
    Array.isArray(value.elements) &&
    value.elements.every(isElementObservation)
  );
}

function isElementObservation(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.ref === 'string' &&
    value.ref.length > 0 &&
    typeof value.tagName === 'string' &&
    value.tagName.length > 0 &&
    (value.role === undefined || typeof value.role === 'string') &&
    Array.isArray(value.colors) &&
    value.colors.length > 0 &&
    value.colors.every(isColorObservation)
  );
}

function isColorObservation(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.property === 'string' &&
    COLOR_PROPERTIES.includes(value.property as (typeof COLOR_PROPERTIES)[number]) &&
    isNormalizedColor(value.color)
  );
}

function isNormalizedColor(value: unknown): value is NormalizedColor {
  return (
    isRecord(value) &&
    isChannel(value.red) &&
    isChannel(value.green) &&
    isChannel(value.blue) &&
    typeof value.alpha === 'number' &&
    Number.isFinite(value.alpha) &&
    value.alpha > 0 &&
    value.alpha <= 1 &&
    typeof value.css === 'string' &&
    value.css.length > 0
  );
}

function isChannel(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
