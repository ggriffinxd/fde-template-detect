import type { BankTemplate, VisualSimilarityResult } from "@/types";

// Visual Analysis Engine — future: Pixelmatch / perceptual hashing / Vision AI.
// Currently returns a structured mock result with full interface compatibility.

export interface VisualComparisonPayload {
  screenshotBase64?: string;
  targetUrl?: string;
  template: BankTemplate;
}

export async function analyzeVisualSimilarity(
  payload: VisualComparisonPayload
): Promise<VisualSimilarityResult> {
  // FUTURE MIGRATION POINT:
  // Replace this mock with real visual comparison pipeline:
  //   1. await screenshotService.capture(payload.targetUrl)
  //   2. await perceptualHasher.hash(screenshot)
  //   3. compare against template.visualFingerprints
  //   4. run pixelmatch/resemble.js diff
  //   5. optionally call Vision AI classification endpoint

  if (payload.template.visualFingerprints.length === 0) {
    return {
      score: 0,
      isMocked: true,
      details: [
        "No visual fingerprints registered for this template",
        "Visual analysis requires template screenshot registration",
        "[Future] Will use perceptual hashing + Pixelmatch comparison",
      ],
    };
  }

  // Mock scoring based on presence of fingerprint metadata
  const mockScore = 60 + Math.random() * 20;

  return {
    score: Math.round(mockScore),
    isMocked: true,
    details: [
      "[MOCK] Visual comparison is simulated — backend browser automation required",
      "[Future] Playwright screenshot → perceptual hash comparison",
      "[Future] Pixelmatch / Resemble.js pixel-level diff",
      "[Future] CLIP embeddings for semantic visual matching",
    ],
  };
}
