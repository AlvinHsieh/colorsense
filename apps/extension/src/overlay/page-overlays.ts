import type { ColorOnlyFinding, SupportedSemantic } from '../detector/types';
import type { OverlayResult, UndoAllResult } from './types';

export function applySemanticOverlay(
  finding: ColorOnlyFinding,
  semanticLabel: string,
): OverlayResult {
  const semanticIcons: Record<SupportedSemantic, string> = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    increase: '▲',
    decrease: '▼',
    selected: '●',
    invalid: '!',
  };

  function findTarget(elementRef: string): Element | undefined {
    return [...document.querySelectorAll('[data-colorsense-ref]')].find(
      (element) => element.getAttribute('data-colorsense-ref') === elementRef,
    );
  }

  function findOverlay(elementRef: string): HTMLElement | undefined {
    return [...document.querySelectorAll<HTMLElement>('[data-colorsense-overlay-for]')].find(
      (element) => element.dataset.colorsenseOverlayFor === elementRef,
    );
  }

  if (
    !finding.semantic ||
    !Object.prototype.hasOwnProperty.call(semanticIcons, finding.semantic) ||
    typeof semanticLabel !== 'string' ||
    semanticLabel.trim().length === 0 ||
    semanticLabel.length > 64 ||
    finding.confidenceScore < 0.55
  ) {
    return { elementRef: finding.elementRef, status: 'unsupported' };
  }
  if (findOverlay(finding.elementRef)) {
    return { elementRef: finding.elementRef, status: 'already-applied' };
  }

  const target = findTarget(finding.elementRef);
  if (!target || !target.isConnected || !document.body) {
    return { elementRef: finding.elementRef, status: 'not-found' };
  }

  const icon = semanticIcons[finding.semantic];
  const overlay = document.createElement('span');
  const safeId = `colorsense-overlay-${crypto.randomUUID()}`;
  const originalDescription = target.getAttribute('aria-describedby');
  overlay.id = safeId;
  overlay.dataset.colorsenseOwned = 'true';
  overlay.dataset.colorsenseOverlayFor = finding.elementRef;
  overlay.dataset.colorsenseHadDescribedby = String(originalDescription !== null);
  if (originalDescription !== null) {
    overlay.dataset.colorsenseOriginalDescribedby = originalDescription;
  }
  overlay.setAttribute('role', 'note');
  overlay.setAttribute('aria-label', `ColorSense: ${semanticLabel}`);
  overlay.textContent = `${icon} ${semanticLabel}`;

  const rect = target.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${window.scrollX + rect.right + 4}px`,
    top: `${window.scrollY + rect.top}px`,
    zIndex: '2147483647',
    pointerEvents: 'none',
    padding: '1px 4px',
    border: '1px solid currentColor',
    borderRadius: '3px',
    background: 'Canvas',
    color: 'CanvasText',
    font: '600 12px/1.4 system-ui, sans-serif',
    whiteSpace: 'nowrap',
  });

  const descriptions = originalDescription?.split(/\s+/).filter(Boolean) ?? [];
  target.setAttribute('aria-describedby', [...descriptions, safeId].join(' '));
  document.body.append(overlay);
  return { elementRef: finding.elementRef, status: 'applied' };
}

export function removeSemanticOverlay(elementRef: string): OverlayResult {
  const overlay = [...document.querySelectorAll<HTMLElement>('[data-colorsense-overlay-for]')].find(
    (element) => element.dataset.colorsenseOverlayFor === elementRef,
  );
  if (!overlay) {
    return { elementRef, status: 'not-found' };
  }

  const target = [...document.querySelectorAll('[data-colorsense-ref]')].find(
    (element) => element.getAttribute('data-colorsense-ref') === elementRef,
  );
  if (target) {
    const currentDescriptions = target.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
    if (currentDescriptions.includes(overlay.id)) {
      const remainingDescriptions = currentDescriptions
        .filter(Boolean)
        .filter((id) => id !== overlay.id);
      if (remainingDescriptions.length > 0) {
        target.setAttribute('aria-describedby', remainingDescriptions.join(' '));
      } else if (overlay.dataset.colorsenseHadDescribedby === 'true') {
        target.setAttribute(
          'aria-describedby',
          overlay.dataset.colorsenseOriginalDescribedby ?? '',
        );
      } else {
        target.removeAttribute('aria-describedby');
      }
    }
  }
  overlay.remove();
  return { elementRef, status: 'removed' };
}

export function removeAllSemanticOverlays(): UndoAllResult {
  let removed = 0;
  let missingTargets = 0;
  const overlays = [...document.querySelectorAll<HTMLElement>('[data-colorsense-overlay-for]')];
  for (const overlay of overlays) {
    const ref = overlay.dataset.colorsenseOverlayFor ?? '';
    const target = [...document.querySelectorAll('[data-colorsense-ref]')].find(
      (element) => element.getAttribute('data-colorsense-ref') === ref,
    );
    if (target) {
      const currentDescriptions = target.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
      if (currentDescriptions.includes(overlay.id)) {
        const remainingDescriptions = currentDescriptions
          .filter(Boolean)
          .filter((id) => id !== overlay.id);
        if (remainingDescriptions.length > 0) {
          target.setAttribute('aria-describedby', remainingDescriptions.join(' '));
        } else if (overlay.dataset.colorsenseHadDescribedby === 'true') {
          target.setAttribute(
            'aria-describedby',
            overlay.dataset.colorsenseOriginalDescribedby ?? '',
          );
        } else {
          target.removeAttribute('aria-describedby');
        }
      }
    } else {
      missingTargets += 1;
    }
    overlay.remove();
    removed += 1;
  }
  return { removed, missingTargets };
}
