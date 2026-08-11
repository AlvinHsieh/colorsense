import { useMemo, useState } from 'react';

import { detectColorOnlyIndicators } from '../../detector/detect-color-only';
import type { CandidateType, ColorOnlyFinding } from '../../detector/types';
import { highlightFindingInActiveTab } from '../../overlay/highlight';
import {
  applyOverlayToActiveTab,
  removeAllOverlaysFromActiveTab,
  removeOverlayFromActiveTab,
} from '../../overlay/run-overlay';
import { scanActiveTab } from '../../scanner/run-scan';

type ScanState = 'idle' | 'scanning' | 'empty' | 'success' | 'partial' | 'restricted' | 'failure';

const TYPE_LABELS: Record<CandidateType, string> = {
  status: 'Status signals',
  trend: 'Trend signals',
  selection: 'Selection signals',
  validation: 'Validation signals',
};

const EVIDENCE_LABELS: Record<string, string> = {
  'aria-state': 'ARIA state',
  'accessible-name': 'Accessible name',
  'semantic-role': 'Semantic role',
  'signed-number': 'Signed number',
  percentage: 'Percentage',
  'status-keyword': 'Status text',
  'nearby-text': 'Nearby status text',
  icon: 'Icon',
  'colored-shape': 'Colored shape',
  'nearby-legend': 'Nearby legend',
  'repeated-color': 'Repeated color',
};

export function App() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [findings, setFindings] = useState<ColorOnlyFinding[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [appliedRefs, setAppliedRefs] = useState<ReadonlySet<string>>(new Set());
  const [actionMessage, setActionMessage] = useState('');

  const groupedFindings = useMemo(() => {
    return findings.reduce<Partial<Record<CandidateType, ColorOnlyFinding[]>>>(
      (groups, finding) => {
        (groups[finding.candidateType] ??= []).push(finding);
        return groups;
      },
      {},
    );
  }, [findings]);

  async function runScan() {
    setScanState('scanning');
    setErrorMessage('');
    setActionMessage('');
    try {
      await removeAllOverlaysFromActiveTab();
      setAppliedRefs(new Set());
      const scan = await scanActiveTab();
      const nextFindings = detectColorOnlyIndicators(scan);
      setFindings(nextFindings);
      setScanState(scan.truncated ? 'partial' : nextFindings.length > 0 ? 'success' : 'empty');
    } catch (error: unknown) {
      const message = readableError(error);
      setFindings([]);
      setErrorMessage(message);
      setScanState(isRestrictedPageError(message) ? 'restricted' : 'failure');
    }
  }

  async function locateFinding(finding: ColorOnlyFinding) {
    try {
      const result = await highlightFindingInActiveTab(finding.elementRef);
      setActionMessage(
        result === 'highlighted'
          ? 'Finding highlighted on the page.'
          : 'The page changed and this finding is no longer available.',
      );
    } catch (error: unknown) {
      setActionMessage(readableError(error));
    }
  }

  async function toggleOverlay(finding: ColorOnlyFinding) {
    try {
      if (appliedRefs.has(finding.elementRef)) {
        const result = await removeOverlayFromActiveTab(finding.elementRef);
        if (result.status === 'removed') {
          setAppliedRefs(withoutRef(appliedRefs, finding.elementRef));
          setActionMessage('Semantic aid removed.');
        }
        return;
      }

      const result = await applyOverlayToActiveTab(finding);
      if (result.status === 'applied' || result.status === 'already-applied') {
        setAppliedRefs(withRef(appliedRefs, finding.elementRef));
        setActionMessage('Semantic aid applied on the page.');
      } else {
        setActionMessage('This finding is no longer available or cannot be transformed safely.');
      }
    } catch (error: unknown) {
      setActionMessage(readableError(error));
    }
  }

  async function undoAll() {
    try {
      const result = await removeAllOverlaysFromActiveTab();
      setAppliedRefs(new Set());
      setActionMessage(`Removed ${result.removed} semantic aid${result.removed === 1 ? '' : 's'}.`);
    } catch (error: unknown) {
      setActionMessage(readableError(error));
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="brand-line">
          <span className="signal-mark" aria-hidden="true">
            C
          </span>
          <span className="eyebrow">Local accessibility instrument</span>
        </div>
        <h1>ColorSense</h1>
        <p>Reveal the meaning hidden behind color-only signals.</p>
      </header>

      <section aria-labelledby="scan-heading" className="panel scan-panel">
        <div className="panel-heading">
          <div>
            <h2 id="scan-heading">Active page scan</h2>
            <p>Page content stays in this tab.</p>
          </div>
          <span className="privacy-mark">Local only</span>
        </div>

        <ScanSummary state={scanState} findings={findings} errorMessage={errorMessage} />

        <button
          className="primary-action"
          disabled={scanState === 'scanning'}
          onClick={() => void runScan()}
          type="button"
        >
          {scanState === 'scanning'
            ? 'Scanning page…'
            : findings.length > 0
              ? 'Scan again'
              : 'Scan this page'}
        </button>
      </section>

      {findings.length > 0 && (
        <section aria-labelledby="findings-heading" className="findings-panel">
          <div className="findings-heading">
            <div>
              <span className="section-index">02</span>
              <h2 id="findings-heading">Review findings</h2>
            </div>
            {appliedRefs.size > 0 && (
              <button className="text-action" onClick={() => void undoAll()} type="button">
                Undo all
              </button>
            )}
          </div>

          {(Object.keys(TYPE_LABELS) as CandidateType[]).map((candidateType) => {
            const group = groupedFindings[candidateType];
            if (!group) return null;
            return (
              <section className="finding-group" key={candidateType}>
                <h3>
                  {TYPE_LABELS[candidateType]} <span>{group.length}</span>
                </h3>
                <div className="finding-list">
                  {group.map((finding, index) => (
                    <FindingCard
                      applied={appliedRefs.has(finding.elementRef)}
                      finding={finding}
                      index={index + 1}
                      key={finding.elementRef}
                      onLocate={locateFinding}
                      onToggleOverlay={toggleOverlay}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      )}

      <p aria-live="polite" className="action-message">
        {actionMessage}
      </p>
      <footer>Deterministic · Private · Reversible</footer>
    </main>
  );
}

function ScanSummary({
  state,
  findings,
  errorMessage,
}: {
  state: ScanState;
  findings: ColorOnlyFinding[];
  errorMessage: string;
}) {
  if (state === 'idle')
    return <p className="state-card">Start a one-time scan when you are ready.</p>;
  if (state === 'scanning')
    return (
      <p aria-live="polite" className="state-card scanning">
        Inspecting visible DOM and SVG colors…
      </p>
    );
  if (state === 'empty')
    return (
      <p className="state-card success">
        <strong>No likely color-only signals found.</strong>
        <span>This page may already provide other visual or text cues.</span>
      </p>
    );
  if (state === 'restricted')
    return (
      <p className="state-card warning">
        <strong>This page cannot be scanned.</strong>
        <span>Chrome protects internal and store pages. Open a regular website and try again.</span>
      </p>
    );
  if (state === 'failure')
    return (
      <p className="state-card warning">
        <strong>Scan failed safely.</strong>
        <span>{errorMessage}</span>
      </p>
    );
  return (
    <p className={`state-card ${state === 'partial' ? 'warning' : 'success'}`}>
      <strong>
        {findings.length} reviewable finding{findings.length === 1 ? '' : 's'}
      </strong>
      <span>
        {state === 'partial'
          ? 'The page exceeded the scan limit; results are partial.'
          : 'Review the evidence before applying any aid.'}
      </span>
    </p>
  );
}

function FindingCard({
  finding,
  index,
  applied,
  onLocate,
  onToggleOverlay,
}: {
  finding: ColorOnlyFinding;
  index: number;
  applied: boolean;
  onLocate: (finding: ColorOnlyFinding) => Promise<void>;
  onToggleOverlay: (finding: ColorOnlyFinding) => Promise<void>;
}) {
  const canTransform = finding.semantic !== undefined && finding.confidenceScore >= 0.55;
  return (
    <article className="finding-card">
      <div className="finding-meta">
        <span className="finding-number">{String(index).padStart(2, '0')}</span>
        <span className={`confidence confidence-${finding.confidence}`}>
          {finding.confidence} · {Math.round(finding.confidenceScore * 100)}%
        </span>
      </div>
      <strong className="finding-title">
        {finding.semantic ? humanize(finding.semantic) : 'Needs review'}
      </strong>
      <span className="disposition">
        {finding.disposition === 'color-only-candidate'
          ? 'Color-only candidate'
          : 'Non-color cue detected'}
      </span>
      <ul className="evidence-list" aria-label="Supporting evidence">
        {finding.evidence.map((evidence) => (
          <li key={evidence}>{EVIDENCE_LABELS[evidence] ?? humanize(evidence)}</li>
        ))}
      </ul>
      <div className="finding-actions">
        <button className="secondary-action" onClick={() => void onLocate(finding)} type="button">
          Locate
        </button>
        {canTransform && (
          <button
            className="secondary-action transform-action"
            onClick={() => void onToggleOverlay(finding)}
            type="button"
          >
            {applied ? 'Undo aid' : `Apply ${humanize(finding.semantic ?? '')}`}
          </button>
        )}
      </div>
    </article>
  );
}

function humanize(value: string): string {
  return value.replaceAll('-', ' ').replace(/^./, (character) => character.toUpperCase());
}

function readableError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'The browser rejected the request.';
}

function isRestrictedPageError(message: string): boolean {
  return /cannot access|chrome:\/\/|edge:\/\/|restricted|permission/i.test(message);
}

function withRef(refs: ReadonlySet<string>, ref: string): ReadonlySet<string> {
  return new Set([...refs, ref]);
}

function withoutRef(refs: ReadonlySet<string>, ref: string): ReadonlySet<string> {
  return new Set([...refs].filter((candidate) => candidate !== ref));
}
