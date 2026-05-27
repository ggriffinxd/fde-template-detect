// Snapshot API — captures the rendered DOM of a URL for template analysis.
//
// Browser selection strategy:
//
//   ┌─────────────────┬────────────────────────────────────────────────────┐
//   │ Environment     │ Strategy                                           │
//   ├─────────────────┼────────────────────────────────────────────────────┤
//   │ Docker/VPS/     │ Full `playwright` package.                         │
//   │ Codespaces      │ Chromium is pre-installed at PLAYWRIGHT_BROWSERS_  │
//   │ (default)       │ PATH=/ms-playwright inside the Playwright image.   │
//   ├─────────────────┼────────────────────────────────────────────────────┤
//   │ Vercel /        │ `@sparticuz/chromium` + `playwright-core`.         │
//   │ AWS Lambda      │ Serverless-optimised ~40 MB binary; no extra       │
//   │                 │ install needed.                                    │
//   └─────────────────┴────────────────────────────────────────────────────┘
//
// Fallback: if Playwright is unavailable OR fails, the route falls back to a
// server-side static fetch (no CORS).  Static HTML lacks JS-rendered content,
// so XPath validation will be incomplete for SPA pages — a warning is surfaced
// to the caller.  The fallback is NEVER silent: every branch logs clearly.

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, SnapshotResult } from "@/types";
import { detectSpaShell } from "@/core/utils/spa-detector";
import { nowIso } from "@/lib/utils";

const STATIC_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

// Detect the runtime environment once at module load — avoids re-checking
// process.env inside every request.
const isServerless =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const isContainer =
  !isServerless &&
  (!!process.env.PLAYWRIGHT_BROWSERS_PATH || // set in Dockerfile
    !!process.env.RAILWAY_ENVIRONMENT ||      // Railway injects this
    !!process.env.CODESPACE_NAME);            // GitHub Codespaces injects this

const runtimeLabel = isServerless
  ? "serverless"
  : isContainer
    ? "container"
    : "local";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { url?: string; timeout?: number; usePlainFetch?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { url, timeout = 30000, usePlainFetch = false } = body;

  if (!url) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "URL is required" },
      { status: 400 },
    );
  }

  // ── Attempt 1: Playwright (full JS rendering) ─────────────────────────────
  if (!usePlainFetch) {
    const result = await captureWithPlaywright(url, timeout);

    if (result.type === "success") {
      return NextResponse.json<ApiResponse<SnapshotResult>>({
        success: true,
        data: result.snapshot,
      });
    }

    // "unavailable" means the playwright package itself couldn't be imported.
    // In container/serverless environments this is a hard misconfiguration.
    if (result.type === "unavailable") {
      if (isContainer) {
        console.error(
          `[Snapshot][${runtimeLabel}] CRITICAL: playwright package not found. ` +
            "Ensure the Dockerfile copies playwright into node_modules and " +
            "PLAYWRIGHT_BROWSERS_PATH=/ms-playwright is set. Falling back to static-fetch.",
        );
      } else {
        console.warn(
          `[Snapshot][${runtimeLabel}] playwright not installed — falling back to static-fetch. ` +
            "Run: npx playwright install chromium",
        );
      }
    }

    // "error" means playwright launched but navigation/render failed.
    if (result.type === "error") {
      console.error(
        `[Snapshot][${runtimeLabel}] Playwright capture failed for ${url}: ` +
          `${result.error} — falling back to static-fetch.`,
      );
    }
  }

  // ── Attempt 2: Static server-side fetch (pre-JS HTML) ────────────────────
  console.info(
    `[Snapshot][${runtimeLabel}] Using static-fetch for ${url}. ` +
      "XPath accuracy will be reduced on SPA pages.",
  );
  return captureWithStaticFetch(url, timeout);
}

// ─────────────────────────────────────────────────────────────────────────────
// Playwright capture
// ─────────────────────────────────────────────────────────────────────────────

type PlaywrightOutcome =
  | { type: "success"; snapshot: SnapshotResult }
  | { type: "unavailable" }
  | { type: "error"; error: string };

// Chromium launch flags that work correctly in headless Linux containers.
// These are applied in both the container path AND the local path so behaviour
// is consistent across environments.
const CHROMIUM_ARGS = [
  "--no-sandbox",                          // required when running as root or in containers
  "--disable-setuid-sandbox",              // companion to --no-sandbox
  "--disable-dev-shm-usage",              // avoid /dev/shm crashes (default 64 MB in Docker)
  "--disable-gpu",                         // no GPU in headless containers
  "--disable-blink-features=AutomationControlled", // reduce bot-detection fingerprint
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
];

async function captureWithPlaywright(
  url: string,
  timeout: number,
): Promise<PlaywrightOutcome> {
  let browser: import("playwright-core").Browser;

  // ── Path A: Serverless (Vercel / AWS Lambda) ──────────────────────────────
  // Full Chromium can't run in a serverless function — use the serverless-
  // optimised @sparticuz/chromium binary instead.
  if (isServerless) {
    console.info(`[Snapshot][serverless] Launching @sparticuz/chromium for ${url}`);
    let chromiumLib: typeof import("@sparticuz/chromium");
    let playwrightCore: typeof import("playwright-core");
    try {
      [chromiumLib, playwrightCore] = await Promise.all([
        import("@sparticuz/chromium"),
        import("playwright-core"),
      ]);
    } catch (err) {
      console.error("[Snapshot][serverless] Failed to import @sparticuz/chromium:", err);
      return { type: "unavailable" };
    }
    try {
      const executablePath = await chromiumLib.default.executablePath();
      console.info(`[Snapshot][serverless] Chromium executable: ${executablePath}`);
      browser = await playwrightCore.chromium.launch({
        args: chromiumLib.default.args,
        executablePath,
        headless: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { type: "error", error: msg };
    }

  // ── Path B: Container / local (Docker, Railway, Codespaces, local dev) ────
  // Use the full playwright package; it reads PLAYWRIGHT_BROWSERS_PATH to
  // locate the pre-installed Chromium.
  } else {
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "(auto-detect)";
    console.info(
      `[Snapshot][${runtimeLabel}] Launching playwright Chromium for ${url} ` +
        `(PLAYWRIGHT_BROWSERS_PATH=${browsersPath})`,
    );
    let playwrightChromium: (typeof import("playwright"))["chromium"];
    try {
      ({ chromium: playwrightChromium } = await import("playwright"));
    } catch (err) {
      console.error(
        `[Snapshot][${runtimeLabel}] Failed to import playwright:`,
        err,
      );
      return { type: "unavailable" };
    }
    try {
      browser = await playwrightChromium.launch({
        headless: true,
        args: CHROMIUM_ARGS,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Snapshot][${runtimeLabel}] chromium.launch() failed: ${msg}`,
      );
      return { type: "error", error: msg };
    }
  }

  // ── Shared browser session ─────────────────────────────────────────────────
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });

    // Remove the navigator.webdriver flag used for bot detection.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();

    // Step 1: Navigate and wait for network idle.
    // networkidle = no network requests for 500 ms → SPA data loads are done.
    await page.goto(url, { waitUntil: "networkidle", timeout });

    // Step 2: Give frameworks a hydration window after network idle.
    // React/Angular/Vue often do a synchronous render pass after data loads.
    await page.waitForTimeout(1500);

    // Step 3: Wait for the login form to appear (up to 5 s extra).
    // Some banks lazy-load the form after the initial render.
    const formExists = await page
      .locator("form")
      .first()
      .waitFor({ timeout: 5000, state: "attached" })
      .then(() => true)
      .catch(() => false);

    if (!formExists) {
      // Step 4: No <form> found — wait for a password input as a last resort.
      // Some shadow-DOM pages render inputs outside a <form> element.
      await page
        .locator("input[type='password']")
        .first()
        .waitFor({ timeout: 3000, state: "attached" })
        .catch(() => {});
    }

    // Serialize the fully rendered DOM — identical to what DevTools shows.
    const htmlContent = await page.content();

    // Capture MHTML via CDP for archival / offline replay.
    // CDP is available in Chromium; may not be present on all configurations.
    let mhtmlContent: string | undefined;
    try {
      const cdp = await context.newCDPSession(page);
      const { data } = await cdp.send("Page.captureSnapshot", {
        format: "mhtml",
      });
      mhtmlContent = data;
    } catch {
      // MHTML is optional — proceed without it.
    }

    // Always close the browser, even if page.content() threw.
    await browser.close();

    const spa = detectSpaShell(htmlContent);
    console.info(
      `[Snapshot][${runtimeLabel}] Captured ${url} — ` +
        `${htmlContent.length} bytes, ` +
        `spa=${spa.isSpaShell}, ` +
        `formCount=${spa.formCount}, ` +
        `mhtml=${!!mhtmlContent}`,
    );

    const snapshot: SnapshotResult = {
      url,
      htmlContent,
      mhtmlContent,
      capturedAt: nowIso(),
      isMocked: false,
      captureMethod: "playwright",
      spaDetected: spa.isSpaShell && spa.formCount === 0,
      spaIndicators: spa.indicators,
    };

    return { type: "success", snapshot };
  } catch (err) {
    await browser.close().catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    return { type: "error", error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Static fetch fallback — server-side HTTP, no CORS restriction
// ─────────────────────────────────────────────────────────────────────────────

async function captureWithStaticFetch(
  url: string,
  timeout: number,
): Promise<NextResponse> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: STATIC_HEADERS,
        redirect: "follow",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error:
            `Server returned HTTP ${response.status}. ` +
            `This may be an authentication wall or bot-protection. ` +
            `Save the page as MHTML from Chrome (Ctrl+S → Webpage, MHTML) and upload it.`,
        },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("text/xml")
    ) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: `Unexpected content-type: "${contentType}". Expected HTML.`,
        },
        { status: 502 },
      );
    }

    const htmlContent = await response.text();

    if (htmlContent.trim().length < 200) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error:
            "Response too short — likely an anti-bot challenge or empty redirect. " +
            "Upload an MHTML file saved from Chrome for accurate analysis.",
        },
        { status: 502 },
      );
    }

    const spa = detectSpaShell(htmlContent);

    const snapshot: SnapshotResult = {
      url,
      htmlContent,
      capturedAt: nowIso(),
      isMocked: false,
      captureMethod: "static-fetch",
      spaDetected: spa.isSpaShell,
      spaIndicators: spa.indicators.length > 0 ? spa.indicators : undefined,
    };

    if (spa.isSpaShell) {
      return NextResponse.json<ApiResponse<SnapshotResult & { spaWarning: string }>>({
        success: true,
        data: {
          ...snapshot,
          spaWarning:
            `This appears to be a JavaScript-rendered page (${spa.indicators[0]}). ` +
            `XPath results from static HTML may be incomplete. ` +
            `For accurate analysis, upload an MHTML file saved from Chrome (Ctrl+S → Webpage, MHTML).`,
        } as SnapshotResult & { spaWarning: string },
      });
    }

    return NextResponse.json<ApiResponse<SnapshotResult>>({
      success: true,
      data: snapshot,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    const isDns =
      msg.toLowerCase().includes("enotfound") ||
      msg.toLowerCase().includes("getaddrinfo");

    const friendly = isTimeout
      ? "Request timed out. The site may block automated access. " +
        "Upload an MHTML snapshot for reliable analysis."
      : isDns
        ? "Could not resolve hostname — check the URL."
        : `Fetch failed: ${msg}. ` +
          "Save the page as MHTML from Chrome (Ctrl+S → Webpage, MHTML) and upload it.";

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: friendly },
      { status: 502 },
    );
  }
}
