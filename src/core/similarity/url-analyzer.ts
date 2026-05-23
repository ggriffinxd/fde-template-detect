import type { BankTemplate, UrlSimilarityResult } from "@/types";

// URL Similarity Engine — compares a target URL against template reference URLs/patterns.

interface ParsedUrl {
  hostname: string;
  pathname: string;
  segments: string[];
  query: Record<string, string>;
  protocol: string;
}

function safeParseUrl(raw: string): ParsedUrl | null {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    return {
      hostname: url.hostname,
      pathname: url.pathname,
      segments: url.pathname.split("/").filter(Boolean),
      query,
      protocol: url.protocol,
    };
  } catch {
    return null;
  }
}

export function analyzeUrlSimilarity(
  targetUrl: string,
  template: BankTemplate
): UrlSimilarityResult {
  if (!targetUrl) {
    return {
      score: 0,
      hostnameMatch: false,
      pathMatch: 0,
      patternMatch: 0,
      details: ["No target URL provided"],
    };
  }

  const parsed = safeParseUrl(targetUrl);
  if (!parsed) {
    return {
      score: 0,
      hostnameMatch: false,
      pathMatch: 0,
      patternMatch: 0,
      details: ["Invalid target URL"],
    };
  }

  const details: string[] = [];

  // 1. Hostname similarity against reference URLs
  let hostnameMatch = false;
  let bestHostnameScore = 0;
  for (const refUrl of template.referenceUrls) {
    const ref = safeParseUrl(refUrl);
    if (!ref) continue;
    const hs = hostnameScore(parsed.hostname, ref.hostname);
    if (hs > bestHostnameScore) bestHostnameScore = hs;
    if (hs >= 100) hostnameMatch = true;
  }

  // 2. Path similarity
  let bestPathScore = 0;
  for (const refUrl of template.referenceUrls) {
    const ref = safeParseUrl(refUrl);
    if (!ref) continue;
    const ps = pathScore(parsed, ref);
    if (ps > bestPathScore) bestPathScore = ps;
  }

  // 3. Pattern matching
  let patternMatchScore = 0;
  let totalPatternWeight = 0;
  for (const pattern of template.urlPatterns) {
    totalPatternWeight += pattern.weight;
    if (matchesPattern(parsed, pattern.pattern, pattern.type)) {
      patternMatchScore += pattern.weight;
      details.push(`Path pattern "${pattern.pattern}" matched`);
    }
  }
  const patternMatch =
    totalPatternWeight > 0
      ? (patternMatchScore / totalPatternWeight) * 100
      : 0;

  // Semantic URL keywords
  const bankKeywords = ["bank", "banking", "secure", "auth", "login", "account", "portal", "online"];
  const urlString = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  const kwMatch = bankKeywords.some((kw) => urlString.includes(kw));
  if (kwMatch) details.push("Banking-related URL keywords detected");

  if (hostnameMatch) details.push("Exact hostname match found");
  if (bestHostnameScore > 50 && !hostnameMatch)
    details.push("Partial hostname similarity detected");
  if (bestPathScore > 70) details.push("Strong path similarity detected");

  // Weighted final score
  const score = Math.min(
    100,
    bestHostnameScore * 0.3 +
      bestPathScore * 0.3 +
      patternMatch * 0.3 +
      (kwMatch ? 10 : 0)
  );

  return {
    score: Math.round(score),
    hostnameMatch,
    pathMatch: Math.round(bestPathScore),
    patternMatch: Math.round(patternMatch),
    details,
  };
}

function hostnameScore(a: string, b: string): number {
  if (a === b) return 100;
  // Remove www prefix for comparison
  const cleanA = a.replace(/^www\./, "");
  const cleanB = b.replace(/^www\./, "");
  if (cleanA === cleanB) return 95;

  // Check TLD+domain match
  const partsA = cleanA.split(".");
  const partsB = cleanB.split(".");
  const domainA = partsA.slice(-2).join(".");
  const domainB = partsB.slice(-2).join(".");
  if (domainA === domainB) return 80;

  // Levenshtein ratio
  return levenshteinSimilarity(cleanA, cleanB) * 40;
}

function pathScore(a: ParsedUrl, b: ParsedUrl): number {
  if (a.pathname === b.pathname) return 100;

  const segsA = a.segments;
  const segsB = b.segments;

  if (segsA.length === 0 && segsB.length === 0) return 100;
  if (segsA.length === 0 || segsB.length === 0) return 20;

  let matches = 0;
  const maxLen = Math.max(segsA.length, segsB.length);
  for (let i = 0; i < Math.min(segsA.length, segsB.length); i++) {
    if (segsA[i] === segsB[i]) matches++;
    else if (levenshteinSimilarity(segsA[i], segsB[i]) > 0.7) matches += 0.5;
  }

  return (matches / maxLen) * 100;
}

function matchesPattern(
  parsed: ParsedUrl,
  pattern: string,
  type: string
): boolean {
  const pathname = parsed.pathname.toLowerCase();
  const patLower = pattern.toLowerCase();

  switch (type) {
    case "exact":
      return pathname === patLower;
    case "partial":
      return pathname.includes(patLower);
    case "path":
      return pathname.includes(patLower);
    case "hostname":
      return parsed.hostname.includes(patLower);
    case "regex":
      try {
        return new RegExp(pattern, "i").test(parsed.pathname);
      } catch {
        return false;
      }
    default:
      return pathname.includes(patLower);
  }
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
