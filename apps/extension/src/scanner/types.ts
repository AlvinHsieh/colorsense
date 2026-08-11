export const COLOR_PROPERTIES = [
  'text',
  'background',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'svg-fill',
  'svg-stroke',
] as const;

export type ColorProperty = (typeof COLOR_PROPERTIES)[number];

export interface NormalizedColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  css: string;
}

export interface ColorObservation {
  property: ColorProperty;
  color: NormalizedColor;
}

export const ARIA_STATE_SIGNALS = [
  'checked',
  'current',
  'disabled',
  'invalid',
  'pressed',
  'selected',
] as const;

export type AriaStateSignal = (typeof ARIA_STATE_SIGNALS)[number];

export const TEXT_SIGNALS = [
  'positive-number',
  'negative-number',
  'percentage',
  'success-keyword',
  'warning-keyword',
  'error-keyword',
] as const;

export type TextSignal = (typeof TEXT_SIGNALS)[number];

export interface ElementSemanticSignals {
  ariaStates: AriaStateSignal[];
  text: TextSignal[];
  nearbyText: TextSignal[];
  hasAccessibleName: boolean;
  hasIcon: boolean;
  coloredShape: boolean;
  nearbyLegend: boolean;
}

export interface ElementColorObservation {
  ref: string;
  tagName: string;
  role?: string;
  colors: ColorObservation[];
  signals: ElementSemanticSignals;
}

export interface DocumentColorScan {
  scanId: string;
  elements: ElementColorObservation[];
  truncated: boolean;
  unsupportedColorValues: number;
}
