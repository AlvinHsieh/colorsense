import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { detectColorOnlyIndicators } from '../../detector/detect-color-only';
import type { CandidateType, ColorOnlyFinding } from '../../detector/types';
import {
  LOCALE_PREFERENCES,
  MESSAGES,
  isLocalePreference,
  resolveLocale,
  type LocalePreference,
  type MessageCatalog,
} from '../../i18n/messages';
import { loadLocalePreference, saveLocalePreference } from '../../i18n/preference';
import { highlightFindingInActiveTab } from '../../overlay/highlight';
import {
  applyOverlayToActiveTab,
  removeAllOverlaysFromActiveTab,
  removeOverlayFromActiveTab,
} from '../../overlay/run-overlay';
import { scanActiveTab } from '../../scanner/run-scan';

type ScanState = 'idle' | 'scanning' | 'empty' | 'success' | 'partial' | 'restricted' | 'failure';

export function App() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [findings, setFindings] = useState<ColorOnlyFinding[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [appliedRefs, setAppliedRefs] = useState<ReadonlySet<string>>(new Set());
  const [actionMessage, setActionMessage] = useState('');
  const [localePreference, setLocalePreference] = useState<LocalePreference>('auto');
  const localeChangedByUser = useRef(false);
  const locale = resolveLocale(localePreference, browserLanguages());
  const messages = MESSAGES[locale];

  useEffect(() => {
    let active = true;
    void loadLocalePreference()
      .then((preference) => {
        if (active && !localeChangedByUser.current) setLocalePreference(preference);
      })
      .catch(() => {
        if (active) {
          const fallbackLocale = resolveLocale('auto', browserLanguages());
          setActionMessage(MESSAGES[fallbackLocale].preferenceLoadFailed);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages.documentTitle;
  }, [locale, messages.documentTitle]);

  const groupedFindings = useMemo(() => {
    return findings.reduce<Partial<Record<CandidateType, ColorOnlyFinding[]>>>(
      (groups, finding) => {
        (groups[finding.candidateType] ??= []).push(finding);
        return groups;
      },
      {},
    );
  }, [findings]);

  async function changeLanguage(event: ChangeEvent<HTMLSelectElement>) {
    const nextPreference: unknown = event.target.value;
    if (!isLocalePreference(nextPreference)) return;

    const nextMessages = MESSAGES[resolveLocale(nextPreference, browserLanguages())];
    localeChangedByUser.current = true;
    setLocalePreference(nextPreference);
    setActionMessage('');

    try {
      await saveLocalePreference(nextPreference);
    } catch {
      setActionMessage(nextMessages.preferenceSaveFailed);
    }

    if (appliedRefs.size > 0) {
      try {
        await removeAllOverlaysFromActiveTab();
        setAppliedRefs(new Set());
      } catch (error: unknown) {
        setActionMessage(localizeError(rawErrorMessage(error), nextMessages));
      }
    }
  }

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
      const rawMessage = rawErrorMessage(error);
      setFindings([]);
      setErrorMessage(rawMessage);
      setScanState(isRestrictedPageError(rawMessage) ? 'restricted' : 'failure');
    }
  }

  async function locateFinding(finding: ColorOnlyFinding) {
    try {
      const result = await highlightFindingInActiveTab(finding.elementRef);
      setActionMessage(
        result === 'highlighted' ? messages.findingHighlighted : messages.findingUnavailable,
      );
    } catch (error: unknown) {
      setActionMessage(localizeError(rawErrorMessage(error), messages));
    }
  }

  async function toggleOverlay(finding: ColorOnlyFinding) {
    try {
      if (appliedRefs.has(finding.elementRef)) {
        const result = await removeOverlayFromActiveTab(finding.elementRef);
        if (result.status === 'removed') {
          setAppliedRefs(withoutRef(appliedRefs, finding.elementRef));
          setActionMessage(messages.aidRemoved);
        }
        return;
      }

      if (!finding.semantic) return;
      const result = await applyOverlayToActiveTab(
        finding,
        messages.semanticLabels[finding.semantic],
      );
      if (result.status === 'applied' || result.status === 'already-applied') {
        setAppliedRefs(withRef(appliedRefs, finding.elementRef));
        setActionMessage(messages.aidApplied);
      } else {
        setActionMessage(messages.aidUnavailable);
      }
    } catch (error: unknown) {
      setActionMessage(localizeError(rawErrorMessage(error), messages));
    }
  }

  async function undoAll() {
    try {
      const result = await removeAllOverlaysFromActiveTab();
      setAppliedRefs(new Set());
      setActionMessage(messages.removedAids(result.removed));
    } catch (error: unknown) {
      setActionMessage(localizeError(rawErrorMessage(error), messages));
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="brand-line">
          <span className="signal-mark" aria-hidden="true">
            C
          </span>
          <span className="eyebrow">{messages.eyebrow}</span>
          <label className="locale-control">
            <span>{messages.languageLabel}</span>
            <select
              aria-label={messages.languageLabel}
              onChange={(event) => void changeLanguage(event)}
              value={localePreference}
            >
              {LOCALE_PREFERENCES.map((preference) => (
                <option key={preference} value={preference}>
                  {messages.languageOptions[preference]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h1>ColorSense</h1>
        <p>{messages.tagline}</p>
      </header>

      <section aria-labelledby="scan-heading" className="panel scan-panel">
        <div className="panel-heading">
          <div>
            <h2 id="scan-heading">{messages.scanHeading}</h2>
            <p>{messages.scanPrivacyDetail}</p>
          </div>
          <span className="privacy-mark">{messages.localOnly}</span>
        </div>

        <ScanSummary
          state={scanState}
          findings={findings}
          errorMessage={localizeError(errorMessage, messages)}
          messages={messages}
        />

        <button
          className="primary-action"
          disabled={scanState === 'scanning'}
          onClick={() => void runScan()}
          type="button"
        >
          {scanState === 'scanning'
            ? messages.scanningButton
            : findings.length > 0
              ? messages.scanAgain
              : messages.scanThisPage}
        </button>
      </section>

      {findings.length > 0 && (
        <section aria-labelledby="findings-heading" className="findings-panel">
          <div className="findings-heading">
            <div>
              <span className="section-index">02</span>
              <h2 id="findings-heading">{messages.reviewFindings}</h2>
            </div>
            {appliedRefs.size > 0 && (
              <button className="text-action" onClick={() => void undoAll()} type="button">
                {messages.undoAll}
              </button>
            )}
          </div>

          {(Object.keys(messages.typeLabels) as CandidateType[]).map((candidateType) => {
            const group = groupedFindings[candidateType];
            if (!group) return null;
            return (
              <section className="finding-group" key={candidateType}>
                <h3>
                  {messages.typeLabels[candidateType]} <span>{group.length}</span>
                </h3>
                <div className="finding-list">
                  {group.map((finding, index) => (
                    <FindingCard
                      applied={appliedRefs.has(finding.elementRef)}
                      finding={finding}
                      index={index + 1}
                      key={finding.elementRef}
                      messages={messages}
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
      <footer>{messages.footer}</footer>
    </main>
  );
}

function ScanSummary({
  state,
  findings,
  errorMessage,
  messages,
}: {
  state: ScanState;
  findings: ColorOnlyFinding[];
  errorMessage: string;
  messages: MessageCatalog;
}) {
  if (state === 'idle') return <p className="state-card">{messages.idle}</p>;
  if (state === 'scanning')
    return (
      <p aria-live="polite" className="state-card scanning">
        {messages.scanning}
      </p>
    );
  if (state === 'empty')
    return (
      <p className="state-card success">
        <strong>{messages.emptyTitle}</strong>
        <span>{messages.emptyDetail}</span>
      </p>
    );
  if (state === 'restricted')
    return (
      <p className="state-card warning">
        <strong>{messages.restrictedTitle}</strong>
        <span>{messages.restrictedDetail}</span>
      </p>
    );
  if (state === 'failure')
    return (
      <p className="state-card warning">
        <strong>{messages.failureTitle}</strong>
        <span>{errorMessage}</span>
      </p>
    );
  return (
    <p className={`state-card ${state === 'partial' ? 'warning' : 'success'}`}>
      <strong>{messages.findingCount(findings.length)}</strong>
      <span>{state === 'partial' ? messages.partialDetail : messages.successDetail}</span>
    </p>
  );
}

function FindingCard({
  finding,
  index,
  applied,
  messages,
  onLocate,
  onToggleOverlay,
}: {
  finding: ColorOnlyFinding;
  index: number;
  applied: boolean;
  messages: MessageCatalog;
  onLocate: (finding: ColorOnlyFinding) => Promise<void>;
  onToggleOverlay: (finding: ColorOnlyFinding) => Promise<void>;
}) {
  const canTransform = finding.semantic !== undefined && finding.confidenceScore >= 0.55;
  return (
    <article className="finding-card">
      <div className="finding-meta">
        <span className="finding-number">{String(index).padStart(2, '0')}</span>
        <span className={`confidence confidence-${finding.confidence}`}>
          {messages.confidenceLabels[finding.confidence]} ·{' '}
          {Math.round(finding.confidenceScore * 100)}%
        </span>
      </div>
      <strong className="finding-title">
        {finding.semantic ? messages.semanticLabels[finding.semantic] : messages.needsReview}
      </strong>
      <span className="disposition">
        {finding.disposition === 'color-only-candidate'
          ? messages.colorOnlyCandidate
          : messages.nonColorCueDetected}
      </span>
      <ul className="evidence-list" aria-label={messages.supportingEvidence}>
        {finding.evidence.map((evidence) => (
          <li key={evidence}>{messages.evidenceLabels[evidence]}</li>
        ))}
      </ul>
      <div className="finding-actions">
        <button className="secondary-action" onClick={() => void onLocate(finding)} type="button">
          {messages.locate}
        </button>
        {canTransform && finding.semantic && (
          <button
            className="secondary-action transform-action"
            onClick={() => void onToggleOverlay(finding)}
            type="button"
          >
            {applied
              ? messages.undoAid
              : messages.applySemantic(messages.semanticLabels[finding.semantic])}
          </button>
        )}
      </div>
    </article>
  );
}

function browserLanguages(): readonly string[] {
  if (navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : ['en'];
}

function rawErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '';
}

function localizeError(message: string, messages: MessageCatalog): string {
  if (/No active browser tab/i.test(message)) return messages.errors.noActiveTab;
  if (/invalid color scan result/i.test(message)) return messages.errors.invalidScan;
  if (/invalid highlight result/i.test(message)) return messages.errors.invalidHighlight;
  if (/invalid overlay result/i.test(message)) return messages.errors.invalidOverlay;
  return messages.errors.browserRejected;
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
