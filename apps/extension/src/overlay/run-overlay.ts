import { browser } from 'wxt/browser';

import type { ColorOnlyFinding } from '../detector/types';
import {
  applySemanticOverlay,
  removeAllSemanticOverlays,
  removeSemanticOverlay,
} from './page-overlays';
import type { OverlayResult, UndoAllResult } from './types';

export async function applyOverlayToActiveTab(finding: ColorOnlyFinding): Promise<OverlayResult> {
  return executeOnActiveTab(applySemanticOverlay, [finding], isOverlayResult);
}

export async function removeOverlayFromActiveTab(elementRef: string): Promise<OverlayResult> {
  return executeOnActiveTab(removeSemanticOverlay, [elementRef], isOverlayResult);
}

export async function removeAllOverlaysFromActiveTab(): Promise<UndoAllResult> {
  return executeOnActiveTab(removeAllSemanticOverlays, [], isUndoAllResult);
}

async function executeOnActiveTab<Arguments extends unknown[], Result>(
  func: (...args: Arguments) => Result,
  args: Arguments,
  validate: (value: unknown) => value is Result,
): Promise<Result> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id === undefined) {
    throw new Error('No active browser tab is available for overlay changes.');
  }
  const injectionResults = await browser.scripting.executeScript({
    target: { tabId: activeTab.id },
    func,
    args,
  });
  const result: unknown = injectionResults[0]?.result;
  if (!validate(result)) {
    throw new Error('The page returned an invalid overlay result.');
  }
  return result;
}

function isOverlayResult(value: unknown): value is OverlayResult {
  return (
    isRecord(value) &&
    typeof value.elementRef === 'string' &&
    ['applied', 'already-applied', 'removed', 'not-found', 'unsupported'].includes(
      String(value.status),
    )
  );
}

function isUndoAllResult(value: unknown): value is UndoAllResult {
  return (
    isRecord(value) &&
    Number.isInteger(value.removed) &&
    Number(value.removed) >= 0 &&
    Number.isInteger(value.missingTargets) &&
    Number(value.missingTargets) >= 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
