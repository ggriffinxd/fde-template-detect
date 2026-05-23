import type { BankTemplate, ParsedDom, SemanticSimilarityResult } from "@/types";

// Semantic Similarity Engine — TF-IDF + keyword matching against template vocabulary.

export function analyzeSemanticSimilarity(
  parsed: ParsedDom,
  template: BankTemplate
): SemanticSimilarityResult {
  const details: string[] = [];
  const textLower = (parsed.textContent + " " + parsed.title).toLowerCase();

  // 1. Keyword matching
  const matchedKeywords: string[] = [];
  for (const keyword of template.semanticKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  const keywordScore =
    template.semanticKeywords.length > 0
      ? (matchedKeywords.length / template.semanticKeywords.length) * 100
      : 50;

  if (matchedKeywords.length > 0) {
    details.push(`${matchedKeywords.length} semantic keyword(s) matched: ${matchedKeywords.slice(0, 3).join(", ")}`);
  }

  // 2. Title match
  let titleMatch = false;
  const titleLower = parsed.title.toLowerCase();
  const bankTerms = ["bank", "banking", "login", "secure", "account", "portal", "authen", "sign in"];
  if (bankTerms.some((t) => titleLower.includes(t))) {
    titleMatch = true;
    details.push(`Page title indicates banking context: "${parsed.title}"`);
  }

  // 3. Meta description / keywords match
  let metaMatch = false;
  const metaContent = Object.values(parsed.metaTags).join(" ").toLowerCase();
  if (template.semanticKeywords.some((kw) => metaContent.includes(kw.toLowerCase()))) {
    metaMatch = true;
    details.push("Meta tags contain template-related keywords");
  }

  // 4. Heading analysis
  const headingText = parsed.headings.join(" ").toLowerCase();
  const headingScore = template.semanticKeywords.some((kw) =>
    headingText.includes(kw.toLowerCase())
  )
    ? 20
    : 0;
  if (headingScore > 0) details.push("Relevant keywords found in headings");

  // 5. TF-IDF cosine similarity (simplified)
  const tfidfScore = computeTfIdfSimilarity(parsed.textContent, template.semanticKeywords);

  const score = Math.round(
    keywordScore * 0.4 +
    tfidfScore * 0.3 +
    (titleMatch ? 15 : 0) +
    (metaMatch ? 10 : 0) +
    headingScore * 0.5
  );

  return {
    score: Math.min(100, score),
    keywordMatches: matchedKeywords,
    titleMatch,
    metaMatch,
    details,
  };
}

// Simplified TF-IDF: measure keyword density across document corpus.
function computeTfIdfSimilarity(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const totalWords = words.length;
  if (totalWords === 0) return 0;

  let totalTf = 0;
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    const freq = words.filter((w) => w.includes(kwLower) || kwLower.includes(w)).length;
    const tf = freq / totalWords;
    // IDF simplified: rare/unique keywords get higher weight
    const idf = 1 + Math.log(10 / (1 + freq));
    totalTf += tf * idf;
  }

  // Normalize to 0-100
  return Math.min(100, (totalTf / keywords.length) * 1000);
}
