import type { ColorOnlyFinding, SupportedSemantic } from '../detector/types';

export type OverlayableFinding = ColorOnlyFinding & { semantic: SupportedSemantic };

export interface OverlayResult {
  elementRef: string;
  status: 'applied' | 'already-applied' | 'removed' | 'not-found' | 'unsupported';
}

export interface UndoAllResult {
  removed: number;
  missingTargets: number;
}
