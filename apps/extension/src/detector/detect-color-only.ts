import type { DocumentColorScan, ElementColorObservation } from '../scanner/types';
import type { CandidateType, ColorOnlyFinding, ConfidenceLevel, DetectionEvidence } from './types';

const VISUAL_PROPERTIES = new Set([
  'background',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'svg-fill',
  'svg-stroke',
]);

export function detectColorOnlyIndicators(scan: DocumentColorScan): ColorOnlyFinding[] {
  const repeatedColors = findRepeatedVisualColors(scan.elements);

  return scan.elements.flatMap((element) => {
    const classification = classify(element);
    if (!classification) {
      return [];
    }

    const evidence = collectEvidence(element, repeatedColors);
    const confidenceScore = scoreEvidence(evidence, classification);
    if (confidenceScore < 0.35) {
      return [];
    }

    const hasAlternative = hasConfirmedNonColorAlternative(element, classification);
    const confidence = toConfidence(confidenceScore);
    return [
      {
        elementRef: element.ref,
        candidateType: classification,
        evidence,
        confidence,
        confidenceScore,
        disposition: hasAlternative ? 'has-non-color-alternative' : 'color-only-candidate',
        reviewRequired: confidence !== 'high' || !hasAlternative,
      },
    ];
  });
}

function classify(element: ElementColorObservation): CandidateType | undefined {
  const { ariaStates, text } = element.signals;
  if (ariaStates.includes('invalid') || element.role === 'alert') {
    return 'validation';
  }
  if (ariaStates.some((state) => ['checked', 'current', 'pressed', 'selected'].includes(state))) {
    return 'selection';
  }
  if (text.some((signal) => signal === 'positive-number' || signal === 'negative-number')) {
    return 'trend';
  }
  if (
    element.role === 'status' ||
    [...text, ...element.signals.nearbyText].some((signal) => signal.endsWith('-keyword')) ||
    (element.signals.coloredShape && element.signals.nearbyLegend)
  ) {
    return 'status';
  }
  return undefined;
}

function collectEvidence(
  element: ElementColorObservation,
  repeatedColors: ReadonlySet<string>,
): DetectionEvidence[] {
  const evidence: DetectionEvidence[] = [];
  const { signals } = element;
  if (signals.ariaStates.length > 0) evidence.push('aria-state');
  if (signals.hasAccessibleName) evidence.push('accessible-name');
  if (element.role === 'status' || element.role === 'alert') evidence.push('semantic-role');
  if (signals.text.some((signal) => signal === 'positive-number' || signal === 'negative-number')) {
    evidence.push('signed-number');
  }
  if (signals.text.includes('percentage')) evidence.push('percentage');
  if (signals.text.some((signal) => signal.endsWith('-keyword'))) evidence.push('status-keyword');
  if (signals.nearbyText.some((signal) => signal.endsWith('-keyword'))) {
    evidence.push('nearby-text');
  }
  if (signals.hasIcon) evidence.push('icon');
  if (signals.coloredShape) evidence.push('colored-shape');
  if (signals.nearbyLegend) evidence.push('nearby-legend');
  if (
    element.colors.some(
      ({ property, color }) => VISUAL_PROPERTIES.has(property) && repeatedColors.has(color.css),
    )
  ) {
    evidence.push('repeated-color');
  }
  return evidence;
}

function scoreEvidence(evidence: DetectionEvidence[], candidateType: CandidateType): number {
  const weights: Record<DetectionEvidence, number> = {
    'aria-state': 0.65,
    'accessible-name': 0.15,
    'semantic-role': 0.45,
    'signed-number': 0.65,
    percentage: 0.1,
    'status-keyword': 0.55,
    'nearby-text': 0.45,
    icon: 0.2,
    'colored-shape': 0.2,
    'nearby-legend': 0.25,
    'repeated-color': 0.1,
  };
  const rawScore = evidence.reduce((total, item) => total + weights[item], 0);
  const typeFloor = candidateType === 'status' && evidence.includes('semantic-role') ? 0.45 : 0;
  return Math.round(Math.min(Math.max(rawScore, typeFloor), 1) * 100) / 100;
}

function hasConfirmedNonColorAlternative(
  element: ElementColorObservation,
  candidateType: CandidateType,
): boolean {
  if (element.signals.ariaStates.length > 0 || element.signals.hasIcon) {
    return true;
  }
  if (
    element.signals.hasAccessibleName &&
    (element.role === 'status' || element.role === 'alert')
  ) {
    return true;
  }
  if (candidateType === 'trend') {
    return element.signals.text.some(
      (signal) => signal === 'positive-number' || signal === 'negative-number',
    );
  }
  return [...element.signals.text, ...element.signals.nearbyText].some((signal) =>
    signal.endsWith('-keyword'),
  );
}

function findRepeatedVisualColors(elements: ElementColorObservation[]): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const element of elements) {
    const colorsOnElement = new Set(
      element.colors
        .filter(({ property }) => VISUAL_PROPERTIES.has(property))
        .map(({ color }) => color.css),
    );
    for (const color of colorsOnElement) {
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([color]) => color));
}

function toConfidence(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}
