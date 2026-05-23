import type {
  BankTemplate,
  ParsedDom,
  StructuralRequirements,
  TemplateMatchResult,
  VerificationPayload,
} from "@/types";
import { DEFAULT_SCORING_WEIGHTS as DEFAULTS } from "@/types";
import { validateXPathRules } from "@/core/validators/xpath-validator";
import { analyzeUrlSimilarity } from "@/core/similarity/url-analyzer";
import { analyzeDomSimilarity } from "@/core/similarity/dom-similarity";
import { analyzeSemanticSimilarity } from "@/core/similarity/semantic-similarity";
import { analyzeVisualSimilarity } from "@/core/visual-analysis/visual-analyzer";
import { nowIso, weightedAverage } from "@/lib/utils";
import type { ConfidenceLevel } from "./types";

export async function scoreTemplateMatch(
  parsed: ParsedDom,
  payload: VerificationPayload,
  template: BankTemplate,
): Promise<TemplateMatchResult> {
  // ── Weight resolution ────────────────────────────────────────────────────
  // When scoringWeights is explicitly defined, unspecified dimensions default
  // to 0 (not the global defaults). This preserves template designer intent:
  // {xpathValidation:50, urlSimilarity:50} means ONLY those two count.
  const hasExplicitWeights = template.scoringWeights !== undefined;
  const raw = template.scoringWeights ?? {};
  const fallback = (def: number | undefined) =>
    hasExplicitWeights ? 0 : (def ?? 0);

  const weights = {
    domStructure:       raw.domStructure       ?? fallback(DEFAULTS.domStructure),
    xpathValidation:    raw.xpathValidation    ?? fallback(DEFAULTS.xpathValidation),
    urlSimilarity:      raw.urlSimilarity      ?? fallback(DEFAULTS.urlSimilarity),
    semanticSimilarity: raw.semanticSimilarity ?? fallback(DEFAULTS.semanticSimilarity),
    visualSimilarity:   raw.visualSimilarity   ?? fallback(DEFAULTS.visualSimilarity),
  };

  // ── Run all engines concurrently ─────────────────────────────────────────
  const [xpathEngine, urlResult, domResult, semanticResult, visualResult] =
    await Promise.all([
      Promise.resolve(validateXPathRules(parsed.rawHtml, template.xpaths)),
      Promise.resolve(analyzeUrlSimilarity(payload.targetUrl ?? "", template)),
      Promise.resolve(analyzeDomSimilarity(parsed, template)),
      Promise.resolve(analyzeSemanticSimilarity(parsed, template)),
      analyzeVisualSimilarity({ targetUrl: payload.targetUrl, template }),
    ]);

  // ── Base weighted score ──────────────────────────────────────────────────
  let overallScore = Math.round(
    weightedAverage([
      { value: domResult.score,          weight: weights.domStructure },
      { value: xpathEngine.totalScore,   weight: weights.xpathValidation },
      { value: urlResult.score,          weight: weights.urlSimilarity },
      { value: semanticResult.score,     weight: weights.semanticSimilarity },
      { value: visualResult.score,       weight: weights.visualSimilarity },
    ]),
  );

  const missingCritical: string[] = [];

  // ── Gate 1: Critical XPaths ──────────────────────────────────────────────
  // Any critical XPath missing → hard cap at 20. These are the elements whose
  // absence definitively rules out a template match (e.g. password field).
  const criticalIds = new Set(template.criticalXpaths ?? []);
  if (criticalIds.size > 0) {
    const criticalMissing = xpathEngine.results.filter(
      (r) => criticalIds.has(r.rule.id) && !r.found,
    );
    if (criticalMissing.length > 0) {
      overallScore = Math.min(overallScore, 20);
      criticalMissing.forEach((r) =>
        missingCritical.push(`Critical element missing: "${r.rule.name}"`),
      );
    }
  }

  // ── Gate 2: Minimum required matches ────────────────────────────────────
  // If fewer required XPaths match than the template demands, cap at 30.
  const requiredXpaths = xpathEngine.results.filter((r) => r.rule.required);
  const requiredFound = requiredXpaths.filter((r) => r.found).length;
  const minRequired =
    template.minimumRequiredMatches ?? requiredXpaths.length;

  if (minRequired > 0 && requiredFound < minRequired) {
    overallScore = Math.min(overallScore, 30);
    missingCritical.push(
      `Only ${requiredFound}/${minRequired} required elements found`,
    );
  }

  // ── Gate 3: Structural requirements ─────────────────────────────────────
  // Hard structural gates that XPath alone cannot catch (e.g. password + form
  // must coexist in the same DOM form, not independently anywhere on the page).
  const structFailures = checkStructuralRequirements(
    parsed,
    template.structuralRequirements,
  );
  if (structFailures.length > 0) {
    overallScore = Math.min(overallScore, 20);
    structFailures.forEach((f) => missingCritical.push(f));
  }

  // ── Soft penalty for missing required XPaths (original behavior) ─────────
  const softPenalty = xpathEngine.requiredMissing.length * 5;
  overallScore = Math.max(0, Math.min(100, overallScore - softPenalty));

  const confidence = scoreToConfidence(overallScore);

  const findings: string[] = [
    ...xpathEngine.results
      .filter((r) => r.found)
      .map((r) => `XPath "${r.rule.name}" matched`),
    ...domResult.details,
    ...urlResult.details,
    ...semanticResult.details,
  ];

  missingCritical.push(
    ...xpathEngine.requiredMissing.map((n) => `Required XPath missing: ${n}`),
  );

  return {
    template,
    overallScore,
    confidence,
    xpathResult: xpathEngine.results,
    urlResult,
    domResult,
    semanticResult,
    visualResult,
    findings: findings.slice(0, 12),
    missingCritical: [...new Set(missingCritical)],
    analyzedAt: nowIso(),
  };
}

// ── Structural coexistence check ─────────────────────────────────────────────
// Validates that required elements exist AND coexist correctly in the DOM.
// This catches cases where a password input exists on the page but not inside
// any login form (e.g. a dashboard that shows a change-password widget).
function checkStructuralRequirements(
  parsed: ParsedDom,
  req: StructuralRequirements | undefined,
): string[] {
  if (!req) return [];
  const failures: string[] = [];

  if (req.hasPasswordInput) {
    const has = parsed.inputs.some((i) => i.type === "password");
    if (!has) failures.push("No password input field found");
  }

  if (req.hasForm) {
    if (parsed.forms.length === 0) failures.push("No <form> element found");
  }

  if (req.hasSubmit) {
    const has = parsed.forms.some((f) => f.hasSubmit);
    if (!has) failures.push("No submit button found inside a form");
  }

  if (req.hasUsernameInput) {
    const has = parsed.inputs.some(
      (i) =>
        i.type === "text" ||
        i.type === "email" ||
        i.id?.toLowerCase().includes("user") ||
        i.name?.toLowerCase().includes("user") ||
        i.id?.toLowerCase().includes("login") ||
        i.name?.toLowerCase().includes("login"),
    );
    if (!has) failures.push("No username/email input found");
  }

  if (req.hasLoginForm) {
    // A login form must have at minimum: a password input AND a text/email
    // input AND a submit button — all inside the SAME <form> element.
    const hasCompleteLoginForm = parsed.forms.some(
      (f) => f.hasPasswordInput && f.hasTextInput && f.hasSubmit,
    );
    if (!hasCompleteLoginForm) {
      failures.push(
        "No complete login form found (form with username + password + submit coexisting)",
      );
    }
  }

  return failures;
}

function scoreToConfidence(score: number): TemplateMatchResult["confidence"] {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  if (score >= 30) return "low";
  return "very-low";
}
