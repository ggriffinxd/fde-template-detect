"use client";
import { useCallback } from "react";
import { useVerificationStore } from "@/store/verification.store";
import { verificationService } from "@/services/verification.service";
import type { VerificationPayload } from "@/types";
import { sleep } from "@/lib/utils";

export function useVerification() {
  const store = useVerificationStore();

  const runVerification = useCallback(async () => {
    const { uploadedFile, targetUrl, sourceType } = store;

    if (sourceType === "upload" && !uploadedFile) {
      store.setErrorMessage("Please upload an HTML or MHTML file.");
      return;
    }
    if (sourceType === "url" && !targetUrl) {
      store.setErrorMessage("Please enter a URL to analyze.");
      return;
    }

    store.reset();
    store.setStatus("fetching");
    store.setProgress(5);

    const stepDelay = 300;

    try {
      // Step 1: Fetch
      store.updateStep("fetch", { status: "running" });
      await sleep(stepDelay);
      store.updateStep("fetch", { status: "done" });
      store.setProgress(15);

      // Step 2: Parse
      store.setStatus("parsing");
      store.updateStep("parse", { status: "running" });
      await sleep(stepDelay);

      const payload: VerificationPayload = {
        sourceType,
        targetUrl: targetUrl || undefined,
        htmlContent: uploadedFile?.type === "html" ? uploadedFile.content : undefined,
        mhtmlContent: uploadedFile?.type === "mhtml" ? uploadedFile.content : undefined,
        fileName: uploadedFile?.name,
      };

      store.updateStep("parse", { status: "done" });
      store.setProgress(30);

      // Step 3-7: Analysis phases with simulated progress
      store.setStatus("analyzing");
      const analysisSteps = ["xpath", "dom", "url", "semantic", "visual"];
      for (let i = 0; i < analysisSteps.length; i++) {
        store.updateStep(analysisSteps[i], { status: "running" });
        await sleep(stepDelay);
        store.updateStep(analysisSteps[i], { status: "done" });
        store.setProgress(30 + (i + 1) * 10);
      }

      // Step 8: Score
      store.updateStep("score", { status: "running" });
      store.setProgress(85);

      const result = await verificationService.verify(payload);

      store.updateStep("score", { status: "done" });
      store.setProgress(100);
      store.setResult(result);
      store.setStatus("complete");
    } catch (err) {
      store.setStatus("error");
      store.setErrorMessage(
        err instanceof Error ? err.message : "Verification failed."
      );
    }
  }, [store]);

  return { runVerification, ...store };
}
