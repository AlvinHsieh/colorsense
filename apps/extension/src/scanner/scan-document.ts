import type {
  ColorObservation,
  ColorProperty,
  DocumentColorScan,
  ElementColorObservation,
  ElementSemanticSignals,
  NormalizedColor,
  TextSignal,
} from './types';

/**
 * Runs inside the active page through browser.scripting.executeScript.
 * Keep runtime helpers nested: injected functions cannot access module scope.
 */
export function scanDocument(scanId: string, maxElements?: number): DocumentColorScan {
  // `scanDocument` is serialized and executed in the target page. Keep these
  // values local so the injected function never depends on extension module
  // scope, which is unavailable in Chrome's scripting execution context.
  const DEFAULT_MAX_ELEMENTS = 2_000;
  const MAX_ELEMENTS_LIMIT = 5_000;

  const requestedLimit = maxElements ?? DEFAULT_MAX_ELEMENTS;
  const boundedLimit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_ELEMENTS_LIMIT)
    : DEFAULT_MAX_ELEMENTS;
  let unsupportedColorValues = 0;

  function roundAlpha(value: number): number {
    return Math.round(value * 1_000) / 1_000;
  }

  function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function parseRgbChannel(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      const percentage = Number.parseFloat(trimmed.slice(0, -1));
      return Number.isFinite(percentage) ? Math.round(clamp(percentage, 0, 100) * 2.55) : undefined;
    }

    const channel = Number.parseFloat(trimmed);
    return Number.isFinite(channel) ? Math.round(clamp(channel, 0, 255)) : undefined;
  }

  function parseAlpha(value: string | undefined): number | undefined {
    if (value === undefined || value.trim().length === 0) {
      return 1;
    }

    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      const percentage = Number.parseFloat(trimmed.slice(0, -1));
      return Number.isFinite(percentage) ? roundAlpha(clamp(percentage / 100, 0, 1)) : undefined;
    }

    const alpha = Number.parseFloat(trimmed);
    return Number.isFinite(alpha) ? roundAlpha(clamp(alpha, 0, 1)) : undefined;
  }

  function normalized(red: number, green: number, blue: number, alpha: number): NormalizedColor {
    return {
      red,
      green,
      blue,
      alpha,
      css: `rgba(${red}, ${green}, ${blue}, ${alpha})`,
    };
  }

  function parseHex(value: string): NormalizedColor | undefined {
    const hex = value.slice(1);
    if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/i.test(hex)) {
      return undefined;
    }

    const expanded =
      hex.length <= 4 ? [...hex].map((character) => character.repeat(2)).join('') : hex;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);
    const alpha =
      expanded.length === 8 ? roundAlpha(Number.parseInt(expanded.slice(6, 8), 16) / 255) : 1;
    return normalized(red, green, blue, alpha);
  }

  function parseRgb(value: string): NormalizedColor | undefined {
    const match = value.match(/^rgba?\((.*)\)$/i);
    if (!match) {
      return undefined;
    }

    const body = match[1]?.trim();
    if (!body) {
      return undefined;
    }

    const slashParts = body.split('/');
    if (slashParts.length > 2) {
      return undefined;
    }

    let channels: string[];
    let alphaValue: string | undefined = slashParts[1];
    if (body.includes(',')) {
      const commaParts = body.split(',').map((part) => part.trim());
      if (commaParts.length !== 3 && commaParts.length !== 4) {
        return undefined;
      }
      channels = commaParts.slice(0, 3);
      alphaValue = commaParts[3];
    } else {
      channels = (slashParts[0] ?? '').trim().split(/\s+/);
      if (channels.length !== 3) {
        return undefined;
      }
    }

    const red = parseRgbChannel(channels[0] ?? '');
    const green = parseRgbChannel(channels[1] ?? '');
    const blue = parseRgbChannel(channels[2] ?? '');
    const alpha = parseAlpha(alphaValue);
    if (red === undefined || green === undefined || blue === undefined || alpha === undefined) {
      return undefined;
    }

    return normalized(red, green, blue, alpha);
  }

  function parseColor(value: string): NormalizedColor | undefined {
    const candidate = value.trim().toLowerCase();
    if (candidate.length === 0 || candidate === 'none') {
      return undefined;
    }
    if (candidate === 'transparent') {
      return normalized(0, 0, 0, 0);
    }

    const parsed = candidate.startsWith('#') ? parseHex(candidate) : parseRgb(candidate);
    if (!parsed) {
      unsupportedColorValues += 1;
    }
    return parsed;
  }

  function isVisible(element: Element, style: CSSStyleDeclaration): boolean {
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      Number.parseFloat(style.opacity || '1') <= 0
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isEditable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const contentEditable = element.getAttribute('contenteditable');
    return (
      ['input', 'textarea', 'select', 'option'].includes(tagName) ||
      (element instanceof HTMLElement && element.isContentEditable) ||
      (contentEditable !== null && contentEditable.toLowerCase() !== 'false')
    );
  }

  function hasDirectText(element: Element): boolean {
    return [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0,
    );
  }

  function signalsFromText(text: string): TextSignal[] {
    const signals: TextSignal[] = [];

    if (/(^|\s|\()\+\s*\d/.test(text)) signals.push('positive-number');
    if (/(^|\s|\()[−-]\s*\d/.test(text)) signals.push('negative-number');
    if (/\d(?:[\d.,]*\d)?\s*%/.test(text)) signals.push('percentage');
    if (/\b(?:success|successful|healthy|online|passed|valid|active|up)\b/.test(text)) {
      signals.push('success-keyword');
    }
    if (/\b(?:warning|warn|pending|degraded|caution|unknown)\b/.test(text)) {
      signals.push('warning-keyword');
    }
    if (/\b(?:error|failed|failure|offline|invalid|critical|down)\b/.test(text)) {
      signals.push('error-keyword');
    }

    return signals;
  }

  function extractTextSignals(element: Element): TextSignal[] {
    const directText = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join(' ');
    const accessibleText = [element.getAttribute('aria-label'), element.getAttribute('title')]
      .filter((value): value is string => Boolean(value))
      .join(' ');
    return signalsFromText(`${directText} ${accessibleText}`.trim().toLowerCase().slice(0, 256));
  }

  function extractNearbyTextSignals(element: Element): TextSignal[] {
    const nearbyText = [...(element.parentElement?.childNodes ?? [])]
      .filter((node) => node !== element && node.textContent)
      .map((node) => node.textContent ?? '')
      .join(' ')
      .trim()
      .toLowerCase()
      .slice(0, 256);
    return signalsFromText(nearbyText);
  }

  function extractSemanticSignals(
    element: Element,
    rect: DOMRect,
    hasText: boolean,
  ): ElementSemanticSignals {
    const ariaStates: ElementSemanticSignals['ariaStates'] = [];
    const ariaAttributes = [
      ['aria-checked', 'checked'],
      ['aria-current', 'current'],
      ['aria-disabled', 'disabled'],
      ['aria-invalid', 'invalid'],
      ['aria-pressed', 'pressed'],
      ['aria-selected', 'selected'],
    ] as const;

    for (const [attribute, signal] of ariaAttributes) {
      const value = element.getAttribute(attribute);
      if (value !== null && value !== 'false') {
        ariaStates.push(signal);
      }
    }

    const hasIcon = Boolean(element.querySelector('svg, [role="img"], img[alt]:not([alt=""])'));
    const coloredShape = !hasText && rect.width <= 48 && rect.height <= 48;
    const nearbyLegend = Boolean(
      element.closest('legend, [role="legend"], figure, [class~="legend"], [class~="key"]'),
    );

    return {
      ariaStates,
      text: extractTextSignals(element),
      nearbyText: extractNearbyTextSignals(element),
      hasAccessibleName: Boolean(
        element.getAttribute('aria-label')?.trim() || element.getAttribute('title')?.trim(),
      ),
      hasIcon,
      coloredShape,
      nearbyLegend,
    };
  }

  function addColor(colors: ColorObservation[], property: ColorProperty, rawValue: string): void {
    const color = parseColor(rawValue);
    if (color && color.alpha > 0) {
      colors.push({ property, color });
    }
  }

  function addBorderColors(colors: ColorObservation[], style: CSSStyleDeclaration): void {
    const sides = ['top', 'right', 'bottom', 'left'] as const;
    for (const side of sides) {
      const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
      const borderStyle = style.getPropertyValue(`border-${side}-style`);
      if (width > 0 && borderStyle !== 'none' && borderStyle !== 'hidden') {
        addColor(colors, `border-${side}`, style.getPropertyValue(`border-${side}-color`));
      }
    }
  }

  function observe(element: Element, ref: string): ElementColorObservation | undefined {
    if (element.closest('[data-colorsense-owned="true"]') || isEditable(element)) {
      return undefined;
    }

    const style = window.getComputedStyle(element);
    if (!isVisible(element, style)) {
      return undefined;
    }

    const colors: ColorObservation[] = [];
    const hasText = hasDirectText(element);
    if (hasText) {
      addColor(colors, 'text', style.color);
    }
    addColor(colors, 'background', style.backgroundColor);
    addBorderColors(colors, style);

    if (typeof SVGElement !== 'undefined' && element instanceof SVGElement) {
      addColor(colors, 'svg-fill', style.fill);
      addColor(colors, 'svg-stroke', style.stroke);
    }

    if (colors.length === 0) {
      return undefined;
    }

    element.setAttribute('data-colorsense-ref', ref);
    const role = element.getAttribute('role')?.trim();
    const rect = element.getBoundingClientRect();
    return {
      ref,
      tagName: element.tagName.toLowerCase(),
      ...(role ? { role } : {}),
      colors,
      signals: extractSemanticSignals(element, rect, hasText),
    };
  }

  for (const previouslyObserved of document.querySelectorAll('[data-colorsense-ref]')) {
    previouslyObserved.removeAttribute('data-colorsense-ref');
  }

  const snapshot = Array.from(document.querySelectorAll('*'));
  const candidates = snapshot.slice(0, boundedLimit);
  const elements: ElementColorObservation[] = [];

  for (const [index, element] of candidates.entries()) {
    try {
      const observation = observe(element, `${scanId}:${index}`);
      if (observation) {
        elements.push(observation);
      }
    } catch {
      // A detached or browser-owned element must not abort the page scan.
    }
  }

  return {
    scanId,
    elements,
    truncated: snapshot.length > boundedLimit,
    unsupportedColorValues,
  };
}
