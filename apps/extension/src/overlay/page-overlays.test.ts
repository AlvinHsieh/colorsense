import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ColorOnlyFinding, SupportedSemantic } from '../detector/types';
import {
  applySemanticOverlay,
  removeAllSemanticOverlays,
  removeSemanticOverlay,
} from './page-overlays';

describe('page semantic overlays', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="existing-description">Existing</div>';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000014');
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      width: 20,
      height: 20,
      top: 20,
      right: 30,
      bottom: 40,
      left: 10,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds an accessible, layout-neutral and pointer-neutral overlay', () => {
    const target = addTarget('target-a');
    target.setAttribute('aria-describedby', 'existing-description');

    expect(applySemanticOverlay(finding('target-a', 'error'), '錯誤')).toEqual({
      elementRef: 'target-a',
      status: 'applied',
    });
    const overlay = document.querySelector<HTMLElement>('[data-colorsense-overlay-for="target-a"]');

    expect(overlay).toHaveAttribute('data-colorsense-owned', 'true');
    expect(overlay).toHaveAttribute('role', 'note');
    expect(overlay).toHaveAttribute('aria-label', 'ColorSense: 錯誤');
    expect(overlay?.textContent).toBe('✕ 錯誤');
    expect(overlay?.style.position).toBe('absolute');
    expect(overlay?.style.pointerEvents).toBe('none');
    expect(target).toHaveAttribute('aria-describedby', `existing-description ${overlay?.id ?? ''}`);
    expect(overlay?.tabIndex).toBe(-1);
  });

  it('is idempotent and restores the original description', () => {
    const target = addTarget('target-b');
    const semanticFinding = finding('target-b', 'increase');

    expect(applySemanticOverlay(semanticFinding, 'Increase').status).toBe('applied');
    expect(applySemanticOverlay(semanticFinding, 'Increase').status).toBe('already-applied');
    expect(document.querySelectorAll('[data-colorsense-overlay-for="target-b"]')).toHaveLength(1);

    expect(removeSemanticOverlay('target-b').status).toBe('removed');
    expect(target).not.toHaveAttribute('aria-describedby');
    expect(document.querySelector('[data-colorsense-overlay-for="target-b"]')).toBeNull();
  });

  it('rejects low-confidence or unsupported semantics', () => {
    addTarget('target-c');

    expect(
      applySemanticOverlay({ ...finding('target-c', 'warning'), confidenceScore: 0.4 }, 'Warning')
        .status,
    ).toBe('unsupported');
    expect(
      applySemanticOverlay({ ...finding('target-c', 'warning'), semantic: undefined }, 'Warning')
        .status,
    ).toBe('unsupported');
    expect(applySemanticOverlay(finding('target-c', 'warning'), '').status).toBe('unsupported');
  });

  it('handles removed targets and page-level undo safely', () => {
    const first = addTarget('target-d');
    addTarget('target-e');
    applySemanticOverlay(finding('target-d', 'selected'), 'Selected');
    applySemanticOverlay(finding('target-e', 'invalid'), 'Invalid');
    first.remove();

    expect(removeAllSemanticOverlays()).toEqual({ removed: 2, missingTargets: 1 });
    expect(document.querySelectorAll('[data-colorsense-overlay-for]')).toHaveLength(0);
  });

  it('preserves page descriptions added after the overlay', () => {
    const target = addTarget('target-mutated');
    applySemanticOverlay(finding('target-mutated', 'warning'), 'Warning');
    const overlay = document.querySelector<HTMLElement>(
      '[data-colorsense-overlay-for="target-mutated"]',
    );
    target.setAttribute('aria-describedby', `${overlay?.id ?? ''} dynamic-description`);

    removeSemanticOverlay('target-mutated');

    expect(target).toHaveAttribute('aria-describedby', 'dynamic-description');
  });

  it('returns not-found when a dynamic target disappears before application', () => {
    const target = addTarget('target-f');
    target.remove();

    expect(applySemanticOverlay(finding('target-f', 'success'), 'Success').status).toBe(
      'not-found',
    );
    expect(removeSemanticOverlay('target-f').status).toBe('not-found');
  });
});

function addTarget(ref: string): HTMLElement {
  const target = document.createElement('span');
  target.dataset.colorsenseRef = ref;
  document.body.append(target);
  return target;
}

function finding(elementRef: string, semantic: SupportedSemantic): ColorOnlyFinding {
  return {
    elementRef,
    candidateType: semantic === 'increase' || semantic === 'decrease' ? 'trend' : 'status',
    evidence: ['status-keyword'],
    confidence: 'medium',
    confidenceScore: 0.7,
    disposition: 'color-only-candidate',
    reviewRequired: true,
    semantic,
  };
}
