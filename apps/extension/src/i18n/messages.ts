import type {
  CandidateType,
  ConfidenceLevel,
  DetectionEvidence,
  SupportedSemantic,
} from '../detector/types';

export const SUPPORTED_LOCALES = ['en', 'zh-TW'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_PREFERENCES = ['auto', ...SUPPORTED_LOCALES] as const;
export type LocalePreference = (typeof LOCALE_PREFERENCES)[number];

export interface MessageCatalog {
  documentTitle: string;
  languageLabel: string;
  languageOptions: Record<LocalePreference, string>;
  eyebrow: string;
  tagline: string;
  scanHeading: string;
  scanPrivacyDetail: string;
  localOnly: string;
  idle: string;
  scanning: string;
  scanningButton: string;
  emptyTitle: string;
  emptyDetail: string;
  restrictedTitle: string;
  restrictedDetail: string;
  failureTitle: string;
  partialDetail: string;
  successDetail: string;
  scanThisPage: string;
  scanAgain: string;
  reviewFindings: string;
  undoAll: string;
  locate: string;
  undoAid: string;
  footer: string;
  findingHighlighted: string;
  findingUnavailable: string;
  aidRemoved: string;
  aidApplied: string;
  aidUnavailable: string;
  preferenceLoadFailed: string;
  preferenceSaveFailed: string;
  typeLabels: Record<CandidateType, string>;
  evidenceLabels: Record<DetectionEvidence, string>;
  confidenceLabels: Record<ConfidenceLevel, string>;
  semanticLabels: Record<SupportedSemantic, string>;
  needsReview: string;
  colorOnlyCandidate: string;
  nonColorCueDetected: string;
  supportingEvidence: string;
  errors: {
    noActiveTab: string;
    invalidScan: string;
    invalidHighlight: string;
    invalidOverlay: string;
    browserRejected: string;
  };
  findingCount: (count: number) => string;
  removedAids: (count: number) => string;
  applySemantic: (semantic: string) => string;
}

export const MESSAGES: Record<SupportedLocale, MessageCatalog> = {
  en: {
    documentTitle: 'ColorSense — reveal color-only meaning',
    languageLabel: 'Language',
    languageOptions: {
      auto: 'Auto',
      en: 'English',
      'zh-TW': '繁體中文',
    },
    eyebrow: 'Local accessibility instrument',
    tagline: 'Reveal the meaning hidden behind color-only signals.',
    scanHeading: 'Active page scan',
    scanPrivacyDetail: 'Page content stays in this tab.',
    localOnly: 'Local only',
    idle: 'Start a one-time scan when you are ready.',
    scanning: 'Inspecting visible DOM and SVG colors…',
    scanningButton: 'Scanning page…',
    emptyTitle: 'No likely color-only signals found.',
    emptyDetail: 'This page may already provide other visual or text cues.',
    restrictedTitle: 'This page cannot be scanned.',
    restrictedDetail:
      'Chrome protects internal and store pages. Open a regular website and try again.',
    failureTitle: 'Scan failed safely.',
    partialDetail: 'The page exceeded the scan limit; results are partial.',
    successDetail: 'Review the evidence before applying any aid.',
    scanThisPage: 'Scan this page',
    scanAgain: 'Scan again',
    reviewFindings: 'Review findings',
    undoAll: 'Undo all',
    locate: 'Locate',
    undoAid: 'Undo aid',
    footer: 'Deterministic · Private · Reversible',
    findingHighlighted: 'Finding highlighted on the page.',
    findingUnavailable: 'The page changed and this finding is no longer available.',
    aidRemoved: 'Semantic aid removed.',
    aidApplied: 'Semantic aid applied on the page.',
    aidUnavailable: 'This finding is no longer available or cannot be transformed safely.',
    preferenceLoadFailed: 'The saved language preference could not be loaded.',
    preferenceSaveFailed: 'The language preference could not be saved.',
    typeLabels: {
      status: 'Status signals',
      trend: 'Trend signals',
      selection: 'Selection signals',
      validation: 'Validation signals',
    },
    evidenceLabels: {
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
    },
    confidenceLabels: { low: 'Low', medium: 'Medium', high: 'High' },
    semanticLabels: {
      success: 'Success',
      warning: 'Warning',
      error: 'Error',
      increase: 'Increase',
      decrease: 'Decrease',
      selected: 'Selected',
      invalid: 'Invalid',
    },
    needsReview: 'Needs review',
    colorOnlyCandidate: 'Color-only candidate',
    nonColorCueDetected: 'Non-color cue detected',
    supportingEvidence: 'Supporting evidence',
    errors: {
      noActiveTab: 'No active browser tab is available.',
      invalidScan: 'The page returned an invalid color scan result.',
      invalidHighlight: 'The page returned an invalid highlight result.',
      invalidOverlay: 'The page returned an invalid semantic overlay result.',
      browserRejected: 'The browser rejected the request.',
    },
    findingCount: (count) => `${count} reviewable finding${count === 1 ? '' : 's'}`,
    removedAids: (count) => `Removed ${count} semantic aid${count === 1 ? '' : 's'}.`,
    applySemantic: (semantic) => `Apply ${semantic}`,
  },
  'zh-TW': {
    documentTitle: 'ColorSense — 揭示顏色背後的語意',
    languageLabel: '語言',
    languageOptions: {
      auto: '自動',
      en: 'English',
      'zh-TW': '繁體中文',
    },
    eyebrow: '本機無障礙辨識工具',
    tagline: '揭示只以顏色傳達、容易被忽略的語意。',
    scanHeading: '掃描目前頁面',
    scanPrivacyDetail: '頁面內容只會留在這個分頁。',
    localOnly: '僅限本機',
    idle: '準備好後，即可執行一次性掃描。',
    scanning: '正在檢查可見的 DOM 與 SVG 顏色…',
    scanningButton: '正在掃描…',
    emptyTitle: '未發現可能只靠顏色傳達的訊號。',
    emptyDetail: '這個頁面可能已提供其他圖像或文字提示。',
    restrictedTitle: '無法掃描這個頁面。',
    restrictedDetail: 'Chrome 會保護內部與商店頁面，請開啟一般網站後再試一次。',
    failureTitle: '掃描已安全停止。',
    partialDetail: '頁面超過掃描上限，目前只顯示部分結果。',
    successDetail: '套用任何輔助標記前，請先檢視判斷依據。',
    scanThisPage: '掃描這個頁面',
    scanAgain: '重新掃描',
    reviewFindings: '檢視發現項目',
    undoAll: '全部復原',
    locate: '定位',
    undoAid: '復原輔助標記',
    footer: '可判定 · 保護隱私 · 可復原',
    findingHighlighted: '已在頁面上標示這個發現項目。',
    findingUnavailable: '頁面內容已變更，這個發現項目已不存在。',
    aidRemoved: '已移除語意輔助標記。',
    aidApplied: '已在頁面上套用語意輔助標記。',
    aidUnavailable: '這個項目已不存在，或無法安全轉換。',
    preferenceLoadFailed: '無法載入已儲存的語言偏好設定。',
    preferenceSaveFailed: '無法儲存語言偏好設定。',
    typeLabels: {
      status: '狀態訊號',
      trend: '趨勢訊號',
      selection: '選取訊號',
      validation: '驗證訊號',
    },
    evidenceLabels: {
      'aria-state': 'ARIA 狀態',
      'accessible-name': '無障礙名稱',
      'semantic-role': '語意角色',
      'signed-number': '帶正負號數值',
      percentage: '百分比',
      'status-keyword': '狀態文字',
      'nearby-text': '鄰近狀態文字',
      icon: '圖示',
      'colored-shape': '彩色形狀',
      'nearby-legend': '鄰近圖例',
      'repeated-color': '重複顏色',
    },
    confidenceLabels: { low: '低', medium: '中', high: '高' },
    semanticLabels: {
      success: '成功',
      warning: '警告',
      error: '錯誤',
      increase: '上升',
      decrease: '下降',
      selected: '已選取',
      invalid: '無效',
    },
    needsReview: '需要檢視',
    colorOnlyCandidate: '可能只靠顏色傳達',
    nonColorCueDetected: '已偵測到非顏色提示',
    supportingEvidence: '判斷依據',
    errors: {
      noActiveTab: '目前沒有可用的瀏覽器分頁。',
      invalidScan: '頁面傳回了無效的顏色掃描結果。',
      invalidHighlight: '頁面傳回了無效的標示結果。',
      invalidOverlay: '頁面傳回了無效的語意輔助結果。',
      browserRejected: '瀏覽器拒絕了這個要求。',
    },
    findingCount: (count) => `${count} 個待檢視項目`,
    removedAids: (count) => `已移除 ${count} 個語意輔助標記。`,
    applySemantic: (semantic) => `套用「${semantic}」`,
  },
};

export function resolveLocale(
  preference: LocalePreference,
  browserLanguages: readonly string[],
): SupportedLocale {
  if (preference !== 'auto') return preference;

  for (const browserLanguage of browserLanguages) {
    const normalized = browserLanguage.toLowerCase();
    if (
      normalized === 'zh-tw' ||
      normalized === 'zh-hk' ||
      normalized === 'zh-mo' ||
      normalized === 'zh-hant' ||
      normalized.startsWith('zh-hant-')
    ) {
      return 'zh-TW';
    }
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  }

  return 'en';
}

export function isLocalePreference(value: unknown): value is LocalePreference {
  return typeof value === 'string' && LOCALE_PREFERENCES.includes(value as LocalePreference);
}
