// Snapshot API — captures the rendered DOM of a URL for template analysis.
//
// Strategy (in order):
//   1. Playwright (Chromium, headless) — executes JavaScript, waits for DOM stability,
//      gives the same DOM you'd see in DevTools. This is the only reliable method
//      for SPAs and JavaScript-rendered banking portals.
//   2. Static fetch fallback — returns the raw server response (pre-JS). Works for
//      server-rendered pages but will fail XPath validation on any SPA.
//
// Why XPaths fail with static fetch but work in DevTools:
//   DevTools queries the LIVE rendered DOM (post-JS). Static fetch captures the
//   HTTP response body — before any JavaScript has executed. If the login form
//   is injected by a JavaScript framework (React/Angular/Vue), it simply does not
//   exist in the static HTML. Playwright solves this by running a real browser.
//
// Browser selection:
//   Local dev:  full `playwright` package + locally-installed Chromium
//               (npx playwright install chromium)
//   Vercel/AWS: `@sparticuz/chromium` + `playwright-core`
//               serverless-optimised ~40MB Chromium binary, no extra install needed

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

  // ── Attempt 1: Playwright ─────────────────────────────────────────────────
  if (!usePlainFetch) {
    const playwrightResult = await captureWithPlaywright(url, timeout);
    if (playwrightResult.type === "success") {
      return NextResponse.json<ApiResponse<SnapshotResult>>({
        success: true,
        data: playwrightResult.snapshot,
      });
    }
    // If Playwright is not installed we fall through silently.
    // Any other Playwright error (navigation failure, bot block, etc.)
    // we also fall through to try static fetch, but preserve the error message.
    if (playwrightResult.type === "error") {
      console.warn("[Snapshot] Playwright capture failed:", playwrightResult.error);
    }
  }

  // ── Attempt 2: Static server-side fetch ──────────────────────────────────
  return captureWithStaticFetch(url, timeout);
}

// ─────────────────────────────────────────────────────────────────────────────
// Playwright capture
// ─────────────────────────────────────────────────────────────────────────────

type PlaywrightOutcome =
  | { type: "success"; snapshot: SnapshotResult }
  | { type: "unavailable" }
  | { type: "error"; error: string };

async function captureWithPlaywright(
  url: string,
  timeout: number,
): Promise<PlaywrightOutcome> {
  // On Vercel/Lambda use @sparticuz/chromium (serverless-optimised ~40MB binary).
  // Locally use the full playwright package with its own Chromium installation.
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  let browser: import("playwright-core").Browser;

  if (isServerless) {
    let chromiumLib: typeof import("@sparticuz/chromium");
    let playwrightCore: typeof import("playwright-core");
    try {
      [chromiumLib, playwrightCore] = await Promise.all([
        import("@sparticuz/chromium"),
        import("playwright-core"),
      ]);
    } catch {
      return { type: "unavailable" };
    }
    try {
      browser = await playwrightCore.chromium.launch({
        args: chromiumLib.default.args,
        executablePath: await chromiumLib.default.executablePath(),
        headless: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { type: "error", error: msg };
    }
  } else {
    let playwrightChromium: (typeof import("playwright"))["chromium"];
    try {
      ({ chromium: playwrightChromium } = await import("playwright"));
    } catch {
      // playwright not installed locally — expected in some environments
      return { type: "unavailable" };
    }
    try {
      browser = await playwrightChromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
        ],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { type: "error", error: msg };
    }
  }

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });

    // Remove the navigator.webdriver flag that banks use for bot detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();

    // Navigate and wait for the network to go idle (all XHR/fetch requests settled)
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout,
    });

    // Give the JS framework time to hydrate after network idle
    // (React/Angular often do a final render pass after data loads)
    await page.waitForTimeout(1500);

    // If there's no form yet, try waiting for one to appear (up to 5s extra)
    const formExists = await page
      .locator("form")
      .first()
      .waitFor({ timeout: 5000, state: "attached" })
      .then(() => true)
      .catch(() => false);

    if (!formExists) {
      // Try waiting for any password input — definitive login-form indicator
      await page
        .locator("input[type='password']")
        .first()
        .waitFor({ timeout: 3000, state: "attached" })
        .catch(() => {});
    }

    // Serialize the fully rendered DOM — this is what DevTools sees
    const htmlContent = await page.content();

    // Capture MHTML via Chrome DevTools Protocol for archival
    let mhtmlContent: string | undefined;
    try {
      const cdp = await context.newCDPSession(page);
      const { data } = await cdp.send("Page.captureSnapshot", {
        format: "mhtml",
      });
      mhtmlContent = data;
    } catch {
      // CDP snapshot is optional — not all browser configurations support it
    }

    await browser.close();

    // Run SPA detection even on Playwright output for diagnostic purposes
    const spa = detectSpaShell(htmlContent);

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
// Static fetch fallback (server-side, no CORS)
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
            `This may be an authentication wall, bot protection, or incorrect URL. ` +
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
          error: `Unexpected content type: "${contentType}". Expected HTML.`,
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
            "Upload an MHTML file or install Playwright for reliable capture.",
        },
        { status: 502 },
      );
    }

    // Detect SPA shell — warn the user that XPath results may be unreliable
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
      // Return success but include the SPA warning in the response
      // The UI will display the warning and lower-confidence results
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
      ? `Request timed out. The site may block automated access. ` +
        `Upload an MHTML snapshot for reliable analysis.`
      : isDns
        ? `Could not resolve hostname — check the URL.`
        : `Fetch failed: ${msg}. ` +
          `For JavaScript-rendered banking portals, save the page as MHTML from Chrome ` +
          `(Ctrl+S → Webpage, MHTML) and upload it.`;

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: friendly },
      { status: 502 },
    );
  }
}
