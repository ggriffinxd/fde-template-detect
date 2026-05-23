// Snapshot Service — routes URL capture through the server-side API.
// Client-side fetch would fail due to CORS on banking sites;
// the /api/snapshot route runs in Node.js and is not CORS-restricted.
//
// Limitation: server-side fetch returns static HTML only.
// JavaScript-heavy SPAs will return incomplete DOM (no dynamic content).
// For full fidelity: save the page as MHTML from Chrome DevTools and upload it.
//
// Future: /api/snapshot will launch a Playwright worker, navigate, wait for
// networkidle, then return the serialized DOM + optional MHTML via CDP.

import type { ApiResponse, SnapshotCaptureOptions, SnapshotResult } from "@/types";
import { apiClient } from "@/lib/api-client";

class SnapshotService {
  async capture(options: SnapshotCaptureOptions): Promise<SnapshotResult> {
    // apiClient throws ApiError on non-2xx, carrying the server's error message.
    const response = await apiClient.post<ApiResponse<SnapshotResult>>(
      "/snapshot",
      { url: options.url, timeout: options.timeout ?? 20000 },
    );

    if (!response.data) {
      throw new Error(
        response.error ??
          "Snapshot returned no data. Save the page as MHTML from Chrome and upload instead.",
      );
    }

    return response.data;
  }

  async downloadMhtml(_url: string): Promise<string> {
    throw new Error(
      "MHTML export requires a Playwright backend worker (CDP Page.captureSnapshot). " +
        "Save the page manually: Chrome → Ctrl+S → Webpage, MHTML.",
    );
  }
}

export const snapshotService = new SnapshotService();
