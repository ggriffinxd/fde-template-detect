import type { BankTemplate, DomSimilarityResult, ParsedDom } from "@/types";

// DOM Structure Similarity Engine — compares parsed DOM against template fingerprints.

export function analyzeDomSimilarity(
  parsed: ParsedDom,
  template: BankTemplate
): DomSimilarityResult {
  const details: string[] = [];

  // Components with defined evidence use their full weight.
  // Components with no evidence defined (empty arrays) are skipped —
  // redistributing their weight avoids a 50-point artificial baseline.
  const cssScore =
    template.cssIndicators.length > 0
      ? computeCssScore(parsed.cssClasses, template.cssIndicators, details)
      : null;

  const fingerprintScore =
    template.domFingerprints.length > 0
      ? computeFingerprintScore(parsed, template, details)
      : null;

  const tagScore = computeTagScore(parsed.tagFrequency, template, details);
  const formScore = computeFormScore(parsed, template, details);

  // Dynamic weighted aggregation — only include defined components
  type Component = { v: number; w: number };
  const components: Component[] = [
    ...(cssScore !== null ? [{ v: cssScore, w: 0.25 }] : []),
    ...(fingerprintScore !== null ? [{ v: fingerprintScore, w: 0.35 }] : []),
    { v: tagScore, w: 0.2 },
    { v: formScore, w: 0.2 },
  ];
  const totalW = components.reduce((s, c) => s + c.w, 0);
  const score =
    totalW > 0
      ? Math.round(components.reduce((s, c) => s + (c.v * c.w) / totalW, 0))
      : 0;

  return {
    score: Math.min(100, score),
    tagSimilarity: Math.round(tagScore),
    classSimilarity: Math.round(cssScore ?? 0),
    structuralSimilarity: Math.round(((fingerprintScore ?? 0) + formScore) / 2),
    fingerprintMatches: countFingerprintMatches(parsed, template),
    details,
  };
}

function computeCssScore(
  docClasses: string[],
  indicators: string[],
  details: string[]
): number {
  if (indicators.length === 0) return 0;

  const docSet = new Set(docClasses.map((c) => c.toLowerCase()));
  let matched = 0;

  for (const indicator of indicators) {
    const clean = indicator.replace(/^[.#]/, "").toLowerCase();
    if (docSet.has(clean) || docClasses.some((c) => c.toLowerCase().includes(clean))) {
      matched++;
      details.push(`CSS indicator "${indicator}" found`);
    }
  }

  return (matched / indicators.length) * 100;
}

function computeFingerprintScore(
  parsed: ParsedDom,
  template: BankTemplate,
  details: string[]
): number {
  if (template.domFingerprints.length === 0) return 0;

  const totalWeight = template.domFingerprints.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return 50;

  let earned = 0;
  for (const fp of template.domFingerprints) {
    if (fingerprintPresentInDom(fp.selector, parsed)) {
      earned += fp.weight;
      details.push(`DOM fingerprint "${fp.selector}" matched`);
    }
  }

  return (earned / totalWeight) * 100;
}

function fingerprintPresentInDom(selector: string, parsed: ParsedDom): boolean {
  if (typeof window === "undefined") {
    // Server: heuristic check
    return heuristicSelectorMatch(selector, parsed);
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(parsed.rawHtml, "text/html");
    return doc.querySelectorAll(selector).length > 0;
  } catch {
    return heuristicSelectorMatch(selector, parsed);
  }
}

function heuristicSelectorMatch(selector: string, parsed: ParsedDom): boolean {
  const lower = parsed.rawHtml.toLowerCase();
  const selectorParts = selector.split(",").map((s) => s.trim().toLowerCase());

  return selectorParts.some((part) => {
    // Extract tag and class/id
    const tagMatch = part.match(/^([a-z]+)/);
    const classMatch = part.match(/\.([a-z0-9_-]+)/g);
    const idMatch = part.match(/#([a-z0-9_-]+)/g);
    const attrMatch = part.match(/\[([^\]]+)\]/g);

    if (tagMatch && lower.includes(`<${tagMatch[1]}`)) return true;
    if (classMatch?.some((c) => lower.includes(c.slice(1)))) return true;
    if (idMatch?.some((i) => lower.includes(i.slice(1)))) return true;
    if (attrMatch?.some((a) => lower.includes(a.slice(1, -1).split("=")[0])))
      return true;

    return false;
  });
}

function computeTagScore(
  tagFreq: Record<string, number>,
  template: BankTemplate,
  details: string[]
): number {
  // Compare tag distribution to expected patterns per template category
  const tags = template.tags ?? [];
  let score = 40; // baseline

  const hasForm = (tagFreq["form"] ?? 0) > 0;
  const hasInput = (tagFreq["input"] ?? 0) > 0;
  const hasTable = (tagFreq["table"] ?? 0) > 0;
  const hasNav = (tagFreq["nav"] ?? 0) > 0;

  if (tags.includes("login") || tags.includes("authentication")) {
    if (hasForm) { score += 20; details.push("Form element present (login indicator)"); }
    if (hasInput) { score += 20; details.push("Input fields present"); }
  }
  if (tags.includes("dashboard") || tags.includes("authenticated")) {
    if (hasNav) { score += 20; details.push("Navigation element detected (dashboard indicator)"); }
    if (hasTable) { score += 15; details.push("Table structure present (data display indicator)"); }
  }
  if (tags.includes("2fa") || tags.includes("verification")) {
    if (hasInput) { score += 25; details.push("Input fields found for code entry"); }
  }

  return Math.min(100, score);
}

function computeFormScore(
  parsed: ParsedDom,
  template: BankTemplate,
  details: string[]
): number {
  const tags = template.tags ?? [];

  if (tags.includes("login") || tags.includes("authentication")) {
    const hasPasswordInput = parsed.inputs.some((i) => i.type === "password");
    const hasTextInput = parsed.inputs.some((i) => i.type === "text" || i.type === "email");
    const hasForms = parsed.forms.length > 0;
    const hasSubmit = parsed.forms.some((f) => f.hasSubmit);

    let score = 0;
    if (hasForms) { score += 25; details.push("Login form structure detected"); }
    if (hasPasswordInput) { score += 35; details.push("Password input found — strong login indicator"); }
    if (hasTextInput) { score += 25; }
    if (hasSubmit) { score += 15; details.push("Submit button found"); }
    return Math.min(100, score);
  }

  if (tags.includes("2fa") || tags.includes("otp")) {
    const hasNumericInput = parsed.inputs.some(
      (i) => i.type === "number" || i.name?.toLowerCase().includes("otp") || i.name?.toLowerCase().includes("token")
    );
    if (hasNumericInput) { details.push("OTP/numeric input detected"); return 85; }
    if (parsed.inputs.length > 0 && parsed.forms.length > 0) return 60;
    return 20;
  }

  if (tags.includes("dashboard")) {
    // No login form expected
    const hasPasswordInput = parsed.inputs.some((i) => i.type === "password");
    return hasPasswordInput ? 30 : 70;
  }

  return 50;
}

function countFingerprintMatches(parsed: ParsedDom, template: BankTemplate): number {
  return template.domFingerprints.filter((fp) =>
    fingerprintPresentInDom(fp.selector, parsed)
  ).length;
}
