import type { AnalysisId, VerificationPayload, VerificationResult } from "@/types";
import { htmlParserService } from "./html-parser.service";
import { snapshotService } from "./snapshot.service";
import { templateRegistryService } from "./template-registry.service";
import { scoreTemplateMatch } from "@/core/scoring/scoring-engine";
import { generateId, nowIso } from "@/lib/utils";

class VerificationService {
  async verify(payload: VerificationPayload): Promise<VerificationResult> {
    // FUTURE: return await apiClient.post<VerificationResult>("/verify", payload)
    // This moves to a backend worker queue for:
    //   - browser automation
    //   - protected scoring algorithms
    //   - encrypted template rules
    //   - AI classification

    const start = Date.now();

    // 1. Resolve HTML content
    let htmlContent = payload.htmlContent ?? payload.mhtmlContent ?? "";
    let isMocked = false;
    const warnings: string[] = [];

    if (!htmlContent && payload.targetUrl) {
      const snapshot = await snapshotService.capture({
        url: payload.targetUrl,
        generateMhtml: false,
        takeScreenshot: false,
      });
      htmlContent = snapshot.htmlContent;
      isMocked = snapshot.isMocked;

      if (snapshot.spaWarning) {
        warnings.push(snapshot.spaWarning);
      }
      if (snapshot.captureMethod === "static-fetch" && snapshot.spaDetected) {
        warnings.push(
          "Playwright captured a static response — XPath accuracy may be reduced. " +
            "Upload an MHTML file saved from Chrome for full accuracy.",
        );
      }
    }

    if (!htmlContent) {
      throw new Error("No HTML content to analyze. Provide a file or URL.");
    }

    // 2. Parse HTML/MHTML
    const isMhtml =
      htmlContent.startsWith("MIME-Version:") ||
      (payload.mhtmlContent !== undefined && payload.mhtmlContent !== "");

    const parseResult = isMhtml
      ? await htmlParserService.parseMhtmlContent(htmlContent)
      : await htmlParserService.parseHtmlContent(htmlContent);

    // 3. Load templates
    const templates = await templateRegistryService.getAll();

    // 4. Score against all active templates
    const matchResults = await Promise.all(
      templates.map((template) =>
        scoreTemplateMatch(parseResult.parsedDom, payload, template)
      )
    );

    // 5. Sort by score descending
    const sorted = matchResults.sort((a, b) => b.overallScore - a.overallScore);

    const result: VerificationResult = {
      id: generateId("vr") as AnalysisId,
      payload: { ...payload, htmlContent: undefined, mhtmlContent: undefined },
      topMatch: sorted[0] ?? null,
      allMatches: sorted,
      processingTimeMs: Date.now() - start,
      createdAt: nowIso(),
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return result;
  }
}

export const verificationService = new VerificationService();
