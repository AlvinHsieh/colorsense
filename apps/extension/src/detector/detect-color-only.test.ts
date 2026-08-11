import { describe, expect, it } from 'vitest';

import type {
  DocumentColorScan,
  ElementColorObservation,
  ElementSemanticSignals,
} from '../scanner/types';
import { detectColorOnlyIndicators } from './detect-color-only';

const emptySignals: ElementSemanticSignals = {
  ariaStates: [],
  text: [],
  nearbyText: [],
  hasAccessibleName: false,
  hasIcon: false,
  coloredShape: false,
  nearbyLegend: false,
};

describe('detectColorOnlyIndicators', () => {
  it('rejects plain colored text as a false positive', () => {
    const findings = detectColorOnlyIndicators(scan(element('plain')));

    expect(findings).toEqual([]);
  });

  it('classifies ARIA validation and selection with confirmed alternatives', () => {
    const invalid = element('invalid', {
      role: 'alert',
      signals: { ...emptySignals, ariaStates: ['invalid'], hasAccessibleName: true },
    });
    const selected = element('selected', {
      signals: { ...emptySignals, ariaStates: ['selected'] },
    });

    const findings = detectColorOnlyIndicators(scan(invalid, selected));

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          elementRef: 'invalid',
          candidateType: 'validation',
          confidence: 'high',
          disposition: 'has-non-color-alternative',
          reviewRequired: false,
        }),
        expect.objectContaining({
          elementRef: 'selected',
          candidateType: 'selection',
          disposition: 'has-non-color-alternative',
        }),
      ]),
    );
  });

  it('recognizes a signed percentage as a non-color trend alternative', () => {
    const trend = element('trend', {
      signals: { ...emptySignals, text: ['negative-number', 'percentage'] },
    });

    expect(detectColorOnlyIndicators(scan(trend))).toEqual([
      expect.objectContaining({
        candidateType: 'trend',
        confidence: 'medium',
        disposition: 'has-non-color-alternative',
      }),
    ]);
  });

  it('keeps a badge with nearby legend evidence reviewable', () => {
    const badge = element('badge', {
      colors: [background('rgba(255, 0, 0, 1)')],
      signals: { ...emptySignals, coloredShape: true, nearbyLegend: true },
    });

    expect(detectColorOnlyIndicators(scan(badge))).toEqual([
      expect.objectContaining({
        candidateType: 'status',
        confidence: 'low',
        disposition: 'color-only-candidate',
        reviewRequired: true,
        evidence: expect.arrayContaining(['colored-shape', 'nearby-legend']),
      }),
    ]);
  });

  it('uses repeated visual colors only as supporting evidence', () => {
    const first = element('first', {
      role: 'status',
      colors: [background('rgba(0, 128, 0, 1)')],
    });
    const second = element('second', {
      colors: [background('rgba(0, 128, 0, 1)')],
    });

    const findings = detectColorOnlyIndicators(scan(first, second));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ elementRef: 'first', confidence: 'medium' });
    expect(findings[0]?.evidence).toContain('repeated-color');
  });

  it('uses status keywords and icons as explicit non-color alternatives', () => {
    const status = element('status', {
      signals: { ...emptySignals, text: ['success-keyword'], hasIcon: true },
    });

    expect(detectColorOnlyIndicators(scan(status))).toEqual([
      expect.objectContaining({
        candidateType: 'status',
        confidence: 'medium',
        disposition: 'has-non-color-alternative',
        evidence: expect.arrayContaining(['status-keyword', 'icon']),
      }),
    ]);
  });

  it('uses nearby status text without returning the original text', () => {
    const status = element('nearby-status', {
      signals: { ...emptySignals, nearbyText: ['error-keyword'] },
    });

    expect(detectColorOnlyIndicators(scan(status))).toEqual([
      expect.objectContaining({
        candidateType: 'status',
        disposition: 'has-non-color-alternative',
        evidence: ['nearby-text'],
      }),
    ]);
  });
});

function scan(...elements: ElementColorObservation[]): DocumentColorScan {
  return {
    scanId: 'test-scan',
    elements,
    truncated: false,
    unsupportedColorValues: 0,
  };
}

function element(
  ref: string,
  overrides: Partial<ElementColorObservation> = {},
): ElementColorObservation {
  return {
    ref,
    tagName: 'span',
    colors: [
      {
        property: 'text',
        color: { red: 200, green: 0, blue: 0, alpha: 1, css: 'rgba(200, 0, 0, 1)' },
      },
    ],
    signals: emptySignals,
    ...overrides,
  };
}

function background(css: string): ElementColorObservation['colors'][number] {
  const channels = css.match(/\d+/g)?.map(Number) ?? [0, 0, 0, 1];
  return {
    property: 'background',
    color: {
      red: channels[0] ?? 0,
      green: channels[1] ?? 0,
      blue: channels[2] ?? 0,
      alpha: 1,
      css,
    },
  };
}
