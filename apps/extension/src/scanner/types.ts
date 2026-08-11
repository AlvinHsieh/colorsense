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

export interface ElementColorObservation {
  ref: string;
  tagName: string;
  role?: string;
  colors: ColorObservation[];
}

export interface DocumentColorScan {
  scanId: string;
  elements: ElementColorObservation[];
  truncated: boolean;
  unsupportedColorValues: number;
}
