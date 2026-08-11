import type {
  ColorObservation,
  ColorProperty,
  DocumentColorScan,
  ElementColorObservation,
  NormalizedColor,
} from './types';

const DEFAULT_MAX_ELEMENTS = 2_000;
const MAX_ELEMENTS_LIMIT = 5_000;

/**
 * Runs inside the active page through browser.scripting.executeScript.
 * Keep runtime helpers nested: injected functions cannot access module scope.
 */
export function scanDocument(
  scanId: string,
  maxElements = DEFAULT_MAX_ELEMENTS,
): DocumentColorScan {
  const boundedLimit = Number.isInteger(maxElements)
    ? Math.min(Math.max(maxElements, 1), MAX_ELEMENTS_LIMIT)
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
    if (hasDirectText(element)) {
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
    return {
      ref,
      tagName: element.tagName.toLowerCase(),
      ...(role ? { role } : {}),
      colors,
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
