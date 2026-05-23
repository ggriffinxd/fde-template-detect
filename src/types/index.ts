// ─── Core Domain Types ─────────────────────────────────────────────────────

export type TemplateId = string;
export type AnalysisId = string;

export interface XPathRule {
  id: string;
  name: string;
  value: string;
  weight: number;
  required: boolean;
  description?: string;
}

export interface UrlPattern {
  id: string;
  pattern: string;
  type: "exact" | "partial" | "regex" | "hostname" | "path";
  weight: number;
}

export interface DomFingerprint {
  id: string;
  selector: string;
  type: "css" | "tag" | "attribute" | "structure";
  weight: number;
}

export interface VisualFingerprint {
  id: string;
  screenshotRef: string;
  hash?: string;
  description?: string;
}

export interface StructuralRequirements {
  hasPasswordInput?: boolean;
  hasForm?: boolean;
  hasSubmit?: boolean;
  hasUsernameInput?: boolean;
  hasLoginForm?: boolean;
}

export interface BankTemplate {
  id: TemplateId;
  name: string;
  description?: string;
  referenceUrls: string[];
  urlPatterns: UrlPattern[];
  xpaths: XPathRule[];
  cssIndicators: string[];
  semanticKeywords: string[];
  visualFingerprints: VisualFingerprint[];
  domFingerprints: DomFingerprint[];
  scoringWeights?: ScoringWeights;
  criticalXpaths?: string[];
  minimumRequiredMatches?: number;
  structuralRequirements?: StructuralRequirements;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRegistry {
  version: string;
  updatedAt: string;
  templates: BankTemplate[];
}

// ─── Scoring & Analysis Types ───────────────────────────────────────────────

export interface ScoringWeights {
  domStructure?: number;
  xpathValidation?: number;
  urlSimilarity?: number;
  semanticSimilarity?: number;
  visualSimilarity?: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  domStructure: 35,
  xpathValidation: 25,
  urlSimilarity: 15,
  semanticSimilarity: 15,
  visualSimilarity: 10,
};

export interface XPathValidationResult {
  rule: XPathRule;
  found: boolean;
  matchCount: number;
  score: number;
  nodeValue?: string;
}

export interface UrlSimilarityResult {
  score: number;
  hostnameMatch: boolean;
  pathMatch: number;
  patternMatch: number;
  details: string[];
}

export interface DomSimilarityResult {
  score: number;
  tagSimilarity: number;
  classSimilarity: number;
  structuralSimilarity: number;
  fingerprintMatches: number;
  details: string[];
}

export interface SemanticSimilarityResult {
  score: number;
  keywordMatches: string[];
  titleMatch: boolean;
  metaMatch: boolean;
  details: string[];
}

export interface VisualSimilarityResult {
  score: number;
  isMocked: boolean;
  details: string[];
}

export interface TemplateMatchResult {
  template: BankTemplate;
  overallScore: number;
  confidence: "very-high" | "high" | "medium" | "low" | "very-low";
  xpathResult: XPathValidationResult[];
  urlResult: UrlSimilarityResult;
  domResult: DomSimilarityResult;
  semanticResult: SemanticSimilarityResult;
  visualResult: VisualSimilarityResult;
  findings: string[];
  missingCritical: string[];
  analyzedAt: string;
}

export interface VerificationPayload {
  targetUrl?: string;
  htmlContent?: string;
  mhtmlContent?: string;
  fileName?: string;
  sourceType: "upload" | "url";
}

export interface VerificationResult {
  id: AnalysisId;
  payload: VerificationPayload;
  topMatch: TemplateMatchResult | null;
  allMatches: TemplateMatchResult[];
  processingTimeMs: number;
  createdAt: string;
  warnings?: string[];
}

// ─── UI State Types ─────────────────────────────────────────────────────────

export type VerificationStatus =
  | "idle"
  | "uploading"
  | "fetching"
  | "parsing"
  | "analyzing"
  | "complete"
  | "error";

export interface UploadedFile {
  name: string;
  type: "html" | "mhtml";
  size: number;
  content: string;
}

export interface AnalysisStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number;
  detail?: string;
}

// ─── Service Types ──────────────────────────────────────────────────────────

export interface SnapshotCaptureOptions {
  url: string;
  generateMhtml: boolean;
  takeScreenshot: boolean;
  waitForSelector?: string;
  timeout?: number;
}

export type SnapshotCaptureMethod = "playwright" | "static-fetch" | "upload";

export interface SnapshotResult {
  url: string;
  htmlContent: string;
  mhtmlContent?: string;
  screenshot?: string;
  capturedAt: string;
  isMocked: boolean;
  captureMethod?: SnapshotCaptureMethod;
  spaDetected?: boolean;
  spaIndicators?: string[];
  // Human-readable warning when SPA is detected via static fetch
  spaWarning?: string;
}

export interface ParsedDom {
  title: string;
  metaTags: Record<string, string>;
  headings: string[];
  links: string[];
  forms: ParsedForm[];
  inputs: ParsedInput[];
  cssClasses: string[];
  tagFrequency: Record<string, number>;
  textContent: string;
  rawHtml: string;
}

export interface ParsedForm {
  action?: string;
  method?: string;
  inputCount: number;
  hasSubmit: boolean;
  hasPasswordInput: boolean;
  hasTextInput: boolean;
  inputIds: string[];
}

export interface ParsedInput {
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
}

// ─── API Types ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Trello Integration Types ────────────────────────────────────────────────

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  labels: string[];
  attachments: TrelloAttachment[];
}

export interface TrelloAttachment {
  name: string;
  url?: string;
  data?: string;
  mimeType?: string;
}

export interface VerificationCardPayload {
  bankName: string;
  probability: number;
  screenshots?: string[];
  findings: string[];
  mhtmlFile?: string;
  similarityMetrics: ScoringWeights;
  result: TemplateMatchResult;
}
