import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { detectColorOnlyIndicators } from '../../detector/detect-color-only';
import type { ColorOnlyFinding } from '../../detector/types';
import { loadLocalePreference, saveLocalePreference } from '../../i18n/preference';
import { highlightFindingInActiveTab } from '../../overlay/highlight';
import {
  applyOverlayToActiveTab,
  removeAllOverlaysFromActiveTab,
  removeOverlayFromActiveTab,
} from '../../overlay/run-overlay';
import { scanActiveTab } from '../../scanner/run-scan';
import { App } from './App';

vi.mock('../../scanner/run-scan', () => ({ scanActiveTab: vi.fn() }));
vi.mock('../../detector/detect-color-only', () => ({ detectColorOnlyIndicators: vi.fn() }));
vi.mock('../../i18n/preference', () => ({
  loadLocalePreference: vi.fn(),
  saveLocalePreference: vi.fn(),
}));
vi.mock('../../overlay/highlight', () => ({ highlightFindingInActiveTab: vi.fn() }));
vi.mock('../../overlay/run-overlay', () => ({
  applyOverlayToActiveTab: vi.fn(),
  removeOverlayFromActiveTab: vi.fn(),
  removeAllOverlaysFromActiveTab: vi.fn(),
}));

const mockedScan = vi.mocked(scanActiveTab);
const mockedDetect = vi.mocked(detectColorOnlyIndicators);
const mockedLoadLocale = vi.mocked(loadLocalePreference);
const mockedSaveLocale = vi.mocked(saveLocalePreference);
const mockedHighlight = vi.mocked(highlightFindingInActiveTab);
const mockedApply = vi.mocked(applyOverlayToActiveTab);
const mockedRemove = vi.mocked(removeOverlayFromActiveTab);
const mockedRemoveAll = vi.mocked(removeAllOverlaysFromActiveTab);

describe('ColorSense popup scan workflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedScan.mockResolvedValue({
      scanId: 'scan',
      elements: [],
      truncated: false,
      unsupportedColorValues: 0,
    });
    mockedDetect.mockReturnValue([]);
    mockedLoadLocale.mockResolvedValue('auto');
    mockedSaveLocale.mockResolvedValue(undefined);
    mockedHighlight.mockResolvedValue('highlighted');
    mockedApply.mockResolvedValue({ elementRef: 'finding-1', status: 'applied' });
    mockedRemove.mockResolvedValue({ elementRef: 'finding-1', status: 'removed' });
    mockedRemoveAll.mockResolvedValue({ removed: 1, missingTargets: 0 });
  });

  it('shows idle, scanning, and empty states', async () => {
    let resolveScan: ((value: Awaited<ReturnType<typeof scanActiveTab>>) => void) | undefined;
    mockedScan.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveScan = resolve;
      }),
    );
    render(<App />);

    expect(screen.getByText('Start a one-time scan when you are ready.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Scan this page' }));
    expect(screen.getByText('Inspecting visible DOM and SVG colors…')).toBeInTheDocument();
    expect(mockedRemoveAll).toHaveBeenCalled();

    resolveScan?.({ scanId: 'scan', elements: [], truncated: false, unsupportedColorValues: 0 });
    expect(await screen.findByText('No likely color-only signals found.')).toBeInTheDocument();
  });

  it('groups findings and supports keyboard-accessible locate, apply, and undo', async () => {
    mockedDetect.mockReturnValue([finding()]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan this page' }));

    expect(await screen.findByText('Status signals')).toBeInTheDocument();
    expect(screen.getByText('Status text')).toBeInTheDocument();
    expect(screen.getByText('Medium · 70%')).toBeInTheDocument();

    const locate = screen.getByRole('button', { name: 'Locate' });
    locate.focus();
    fireEvent.keyDown(locate, { key: 'Enter' });
    fireEvent.click(locate);
    await waitFor(() => expect(mockedHighlight).toHaveBeenCalledWith('finding-1'));

    fireEvent.click(screen.getByRole('button', { name: 'Apply Error' }));
    expect(await screen.findByRole('button', { name: 'Undo aid' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo aid' }));
    await waitFor(() => expect(mockedRemove).toHaveBeenCalledWith('finding-1'));
  });

  it('shows partial results and supports page-level undo', async () => {
    mockedScan.mockResolvedValue({
      scanId: 'scan',
      elements: [],
      truncated: true,
      unsupportedColorValues: 0,
    });
    mockedDetect.mockReturnValue([finding()]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan this page' }));

    expect(
      await screen.findByText('The page exceeded the scan limit; results are partial.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Error' }));
    const undoAll = await screen.findByRole('button', { name: 'Undo all' });
    fireEvent.click(undoAll);

    await waitFor(() => expect(mockedRemoveAll).toHaveBeenCalled());
    expect(await screen.findByText('Removed 1 semantic aid.')).toBeInTheDocument();
  });

  it('explains restricted pages without exposing the raw browser error', async () => {
    mockedScan.mockRejectedValue(new Error('Cannot access a chrome:// URL.'));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan this page' }));

    expect(await screen.findByText('This page cannot be scanned.')).toBeInTheDocument();
    expect(screen.queryByText('Cannot access a chrome:// URL.')).not.toBeInTheDocument();
  });

  it('shows safe failure details for non-restricted errors', async () => {
    mockedScan.mockRejectedValue(new Error('The page returned an invalid color scan result.'));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan this page' }));

    expect(await screen.findByText('Scan failed safely.')).toBeInTheDocument();
    expect(screen.getByText('The page returned an invalid color scan result.')).toBeInTheDocument();
  });

  it('switches to Traditional Chinese, updates document language, and persists locally', async () => {
    render(<App />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'zh-TW' },
    });

    expect(await screen.findByText('掃描目前頁面')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '掃描這個頁面' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('zh-TW');
    expect(document.title).toBe('ColorSense — 揭示顏色背後的語意');
    await waitFor(() => expect(mockedSaveLocale).toHaveBeenCalledWith('zh-TW'));
  });

  it('loads a persisted locale and removes stale overlays when the language changes', async () => {
    mockedLoadLocale.mockResolvedValue('zh-TW');
    mockedDetect.mockReturnValue([finding()]);
    render(<App />);

    expect(await screen.findByText('掃描目前頁面')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '掃描這個頁面' }));
    fireEvent.click(await screen.findByRole('button', { name: '套用「錯誤」' }));
    expect(await screen.findByRole('button', { name: '復原輔助標記' })).toBeInTheDocument();

    mockedRemoveAll.mockClear();
    fireEvent.change(screen.getByRole('combobox', { name: '語言' }), {
      target: { value: 'en' },
    });

    await waitFor(() => expect(mockedRemoveAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Apply Error' })).toBeInTheDocument();
  });
});

function finding(): ColorOnlyFinding {
  return {
    elementRef: 'finding-1',
    candidateType: 'status',
    evidence: ['status-keyword'],
    confidence: 'medium',
    confidenceScore: 0.7,
    disposition: 'color-only-candidate',
    reviewRequired: true,
    semantic: 'error',
  };
}
