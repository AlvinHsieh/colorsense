import { useState } from 'react';

import {
  checkConnections,
  type ConnectionReport,
  type ConnectionResult,
} from '../../lib/connections';

export function App() {
  const [report, setReport] = useState<ConnectionReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function runConnectionCheck() {
    setIsChecking(true);
    try {
      setReport(await checkConnections());
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">v0.1 Foundation</span>
        <h1>ColorSense</h1>
        <p>Turn color-dependent signals into meaning you can understand without color alone.</p>
      </header>

      <section aria-labelledby="connection-heading" className="panel">
        <div className="panel-heading">
          <div>
            <h2 id="connection-heading">Local connection</h2>
            <p>No page content leaves your browser.</p>
          </div>
          <span className="privacy-mark" aria-label="Local only">
            Local
          </span>
        </div>

        {report === null ? (
          <p className="empty-state">Run a safe handshake with the extension and current tab.</p>
        ) : (
          <div className="results" aria-live="polite">
            <ResultRow label="Background" result={report.background} />
            <ResultRow label="Current page" result={report.page} />
          </div>
        )}

        <button disabled={isChecking} onClick={() => void runConnectionCheck()} type="button">
          {isChecking ? 'Checking…' : 'Check connection'}
        </button>
      </section>

      <footer>Scanner, detector, and overlays arrive in later Issues.</footer>
    </main>
  );
}

interface ResultRowProps {
  label: string;
  result: ConnectionResult;
}

function ResultRow({ label, result }: ResultRowProps) {
  const isReady = result.status === 'ready';

  return (
    <div className="result-row">
      <span aria-hidden="true" className={`status-icon ${isReady ? 'ready' : 'unavailable'}`}>
        {isReady ? '✓' : '!'}
      </span>
      <div>
        <strong>{label}</strong>
        <span>{isReady ? `Ready · v${result.version}` : result.reason}</span>
      </div>
    </div>
  );
}
