export const CANDIDATE_TYPES = ['status', 'trend', 'selection', 'validation'] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

export const DETECTION_EVIDENCE = [
  'aria-state',
  'accessible-name',
  'semantic-role',
  'signed-number',
  'percentage',
  'status-keyword',
  'nearby-text',
  'icon',
  'colored-shape',
  'nearby-legend',
  'repeated-color',
] as const;
export type DetectionEvidence = (typeof DETECTION_EVIDENCE)[number];

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type AccessibilityDisposition = 'color-only-candidate' | 'has-non-color-alternative';

export interface ColorOnlyFinding {
  elementRef: string;
  candidateType: CandidateType;
  evidence: DetectionEvidence[];
  confidence: ConfidenceLevel;
  confidenceScore: number;
  disposition: AccessibilityDisposition;
  reviewRequired: boolean;
}
