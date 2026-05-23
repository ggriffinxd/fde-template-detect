// SPA Shell Detector — identifies when a fetched HTML is a JavaScript-only
// shell (empty <div id="root">) rather than a fully rendered page.
//
// This is the root cause of XPath failures: the server returns pre-JS HTML,
// but the form elements only exist after the JavaScript framework hydrates.
// Playwright is required to get the real rendered DOM.

export interface SpaDetectionResult {
  isSpaShell: boolean;
  confidence: number;        // 0–100
  indicators: string[];      // human-readable list of what triggered detection
  formCount: number;
  inputCount: number;
  scriptCount: number;
  bodyTextLength: number;
}

export function detectSpaShell(html: string): SpaDetectionResult {
  const lower = html.toLowerCase();
  const indicators: string[] = [];

  // React / Next.js root
  if (/__next_f\s*=|__next_data|id=["']__next["']/.test(html)) {
    indicators.push("Next.js application shell detected");
  } else if (/id=["']root["']/.test(html)) {
    indicators.push("React root element detected (id='root')");
  }

  // Angular / Vue / generic SPA shells
  if (/id=["']app["']|<app-root|ng-version=/.test(html)) {
    indicators.push("Angular/Vue application shell detected");
  }

  // No form or input elements — strongest signal
  const formCount = (html.match(/<form[\s>]/gi) ?? []).length;
  const inputCount = (html.match(/<input[\s>]/gi) ?? []).length;
  if (formCount === 0 && inputCount === 0) {
    indicators.push(
      "No <form> or <input> elements in server response — form is rendered by JavaScript",
    );
  } else if (formCount === 0) {
    indicators.push("No <form> elements — form container injected by JavaScript");
  }

  // Heavy script loading without content
  const scriptCount = (html.match(/<script/gi) ?? []).length;
  if (scriptCount >= 4 && inputCount === 0) {
    indicators.push(
      `${scriptCount} <script> tags with no interactive elements — JavaScript-rendered content`,
    );
  }

  // Body has almost no visible text
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = (bodyMatch?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (bodyText.length < 300) {
    indicators.push(
      `Body contains only ${bodyText.length} characters of text — shell page`,
    );
  }

  // Webpack/bundler chunk loading patterns
  if (/chunk[-_.]|\.bundle\.js|main\.[a-f0-9]+\.js/.test(html)) {
    indicators.push("JavaScript bundle loading detected (webpack/vite chunk pattern)");
  }

  // Anti-bot / challenge page patterns
  if (/just a moment|checking your browser|ddos-guard|cloudflare ray id/i.test(html)) {
    indicators.push(
      "Anti-bot challenge page detected (Cloudflare/DDoS-Guard) — not the real login page",
    );
  }

  // Redirect / loading screen
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) {
    indicators.push("HTTP meta-refresh redirect detected — not the target page");
  }

  const isSpaShell = indicators.length >= 2 || (formCount === 0 && inputCount === 0);
  const confidence = Math.min(100, indicators.length * 25);

  return {
    isSpaShell,
    confidence,
    indicators,
    formCount,
    inputCount,
    scriptCount,
    bodyTextLength: bodyText.length,
  };
}
