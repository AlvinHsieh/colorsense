import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectColorOnlyIndicators } from '../detector/detect-color-only';
import { applySemanticOverlay, removeAllSemanticOverlays } from '../overlay/page-overlays';
import { scanDocument } from '../scanner/scan-document';

describe('ColorSense local MVP journey', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section aria-label="Service health">
        <span id="status-dot" role="status" aria-label="Service offline" style="background-color: #c02020"></span>
        <span>Offline</span>
      </section>
    `;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const compact = this.id === 'status-dot';
      const width = compact ? 16 : 120;
      const height = compact ? 16 : 28;
      return {
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        right: width,
        bottom: height,
        left: 0,
        toJSON: () => ({}),
      };
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000015');
  });

  afterEach(() => vi.restoreAllMocks());

  it('scans, explains, transforms, and reverses a DOM status without leaking raw text', () => {
    const scan = scanDocument('journey');
    const findings = detectColorOnlyIndicators(scan);
    const status = findings.find((finding) => finding.semantic === 'error');

    expect(status).toMatchObject({
      candidateType: 'status',
      disposition: 'has-non-color-alternative',
      semantic: 'error',
    });
    expect(JSON.stringify(scan)).not.toContain('Offline');
    expect(JSON.stringify(scan)).not.toContain('Service offline');

    expect(status && applySemanticOverlay(status)).toMatchObject({ status: 'applied' });
    expect(document.querySelector('[data-colorsense-overlay-for]')).toHaveTextContent('✕ Error');
    expect(removeAllSemanticOverlays()).toEqual({ removed: 1, missingTargets: 0 });
    expect(document.querySelector('[data-colorsense-overlay-for]')).toBeNull();
  });
});
