import { browser } from 'wxt/browser';

export type HighlightResult = 'highlighted' | 'not-found';

export async function highlightFindingInActiveTab(elementRef: string): Promise<HighlightResult> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id === undefined) {
    throw new Error('No active browser tab is available for highlighting.');
  }
  const injectionResults = await browser.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: highlightFinding,
    args: [elementRef],
  });
  const result: unknown = injectionResults[0]?.result;
  if (result !== 'highlighted' && result !== 'not-found') {
    throw new Error('The page returned an invalid highlight result.');
  }
  return result;
}

export function highlightFinding(elementRef: string): HighlightResult {
  const target = [...document.querySelectorAll('[data-colorsense-ref]')].find(
    (element) => element.getAttribute('data-colorsense-ref') === elementRef,
  );
  if (!target || !target.isConnected || !document.body) {
    return 'not-found';
  }

  document.querySelectorAll('[data-colorsense-highlight="true"]').forEach((node) => node.remove());
  const rect = target.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.dataset.colorsenseOwned = 'true';
  highlight.dataset.colorsenseHighlight = 'true';
  highlight.setAttribute('aria-hidden', 'true');
  Object.assign(highlight.style, {
    position: 'absolute',
    left: `${window.scrollX + rect.left - 4}px`,
    top: `${window.scrollY + rect.top - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`,
    zIndex: '2147483646',
    pointerEvents: 'none',
    border: '3px solid #005fcc',
    borderRadius: '5px',
    boxShadow: '0 0 0 3px #ffffff, 0 0 0 6px #005fcc',
  });
  document.body.append(highlight);
  target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  window.setTimeout(() => highlight.remove(), 2_000);
  return 'highlighted';
}
