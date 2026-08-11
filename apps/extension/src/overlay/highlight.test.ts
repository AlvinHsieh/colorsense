import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { highlightFinding } from './highlight';

describe('finding highlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button data-colorsense-ref="finding">Target</button>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      top: 20,
      right: 40,
      bottom: 60,
      left: 10,
      toJSON: () => ({}),
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, 'setTimeout').mockImplementation(() => 1);
  });

  afterEach(() => vi.restoreAllMocks());

  it('creates an owned, non-interactive focus ring without changing target focusability', () => {
    const target = document.querySelector('button');
    const originalTabIndex = target?.tabIndex;

    expect(highlightFinding('finding')).toBe('highlighted');
    const ring = document.querySelector<HTMLElement>('[data-colorsense-highlight="true"]');
    expect(ring).toHaveAttribute('data-colorsense-owned', 'true');
    expect(ring).toHaveAttribute('aria-hidden', 'true');
    expect(ring?.style.pointerEvents).toBe('none');
    expect(target?.tabIndex).toBe(originalTabIndex);
    expect(target?.scrollIntoView).toHaveBeenCalled();
  });

  it('returns safely when the finding no longer exists', () => {
    expect(highlightFinding('missing')).toBe('not-found');
  });
});
