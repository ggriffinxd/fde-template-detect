import type { XPathRule, XPathValidationResult } from "@/types";

// XPath Validation Engine — client-side uses browser XPath evaluation.
// Server-side: drop in xpath/xmldom packages for Node.js.

export interface XPathEngineResult {
  results: XPathValidationResult[];
  totalScore: number;
  requiredMissing: string[];
  passedCount: number;
  failedCount: number;
}

export function validateXPathRules(
  htmlContent: string,
  rules: XPathRule[]
): XPathEngineResult {
  if (typeof window === "undefined") {
    return validateXPathServer(htmlContent, rules);
  }
  return validateXPathClient(htmlContent, rules);
}

function validateXPathClient(
  htmlContent: string,
  rules: XPathRule[]
): XPathEngineResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const results: XPathValidationResult[] = rules.map((rule) => {
    try {
      const xpathResult = doc.evaluate(
        rule.value,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const matchCount = xpathResult.snapshotLength;
      const found = matchCount > 0;

      let nodeValue: string | undefined;
      if (found) {
        const node = xpathResult.snapshotItem(0);
        nodeValue =
          node?.textContent?.trim().slice(0, 100) ??
          (node as Element)?.getAttribute?.("class") ??
          undefined;
      }

      const score = found ? rule.weight : 0;

      return { rule, found, matchCount, score, nodeValue };
    } catch {
      return { rule, found: false, matchCount: 0, score: 0 };
    }
  });

  return buildEngineResult(results, rules);
}

// Server-side: use CSS selector approximation when XPath engine unavailable.
function validateXPathServer(
  htmlContent: string,
  rules: XPathRule[]
): XPathEngineResult {
  const results: XPathValidationResult[] = rules.map((rule) => {
    const found = xpathHeuristicMatch(rule.value, htmlContent);
    return {
      rule,
      found,
      matchCount: found ? 1 : 0,
      score: found ? rule.weight : 0,
    };
  });
  return buildEngineResult(results, rules);
}

function buildEngineResult(
  results: XPathValidationResult[],
  rules: XPathRule[]
): XPathEngineResult {
  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const earnedScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalScore = totalWeight > 0 ? (earnedScore / totalWeight) * 100 : 0;

  const requiredMissing = results
    .filter((r) => r.rule.required && !r.found)
    .map((r) => r.rule.name);

  const passedCount = results.filter((r) => r.found).length;
  const failedCount = results.filter((r) => !r.found).length;

  return { results, totalScore, requiredMissing, passedCount, failedCount };
}

// Heuristic: convert common XPath patterns to regex/string checks.
function xpathHeuristicMatch(xpath: string, html: string): boolean {
  const lower = html.toLowerCase();

  // //input[@type='password']
  if (xpath.includes("type='password'") || xpath.includes('type="password"')) {
    return lower.includes('type="password"') || lower.includes("type='password'");
  }
  if (xpath.includes("type='text'") || xpath.includes("type='email'")) {
    return lower.includes('type="text"') || lower.includes('type="email"');
  }
  if (xpath.includes("type='submit'") || xpath.includes("button[@type='submit']")) {
    return lower.includes('type="submit"') || (lower.includes("<button") && lower.includes("submit"));
  }
  if (xpath.includes("type='number'") || xpath.includes("name='otp'")) {
    return lower.includes('type="number"') || lower.includes("name=\"otp\"");
  }
  if (xpath.includes("'balance'") || xpath.includes("'saldo'")) {
    return lower.includes("balance") || lower.includes("saldo");
  }
  if (xpath.includes("forgot") || xpath.includes("esqueceu")) {
    return lower.includes("forgot") || lower.includes("esqueceu");
  }
  if (xpath.includes("<form") || xpath.includes("//form")) {
    return lower.includes("<form");
  }
  if (xpath.includes("//nav") || xpath.includes("navigation")) {
    return lower.includes("<nav") || lower.includes('role="navigation"');
  }

  // Generic: check if any tag/attribute names in the xpath appear in HTML
  const tagMatch = xpath.match(/\/\/([a-zA-Z]+)/);
  if (tagMatch?.[1]) {
    return lower.includes(`<${tagMatch[1].toLowerCase()}`);
  }

  return false;
}
