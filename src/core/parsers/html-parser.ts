import type { ParsedDom, ParsedForm, ParsedInput } from "@/types";

// Client-side HTML parser using DOMParser (browser-native).
// Server-side: swap for cheerio/jsdom/parse5.

export function parseHtml(rawHtml: string): ParsedDom {
  if (typeof window === "undefined") {
    return parseHtmlServer(rawHtml);
  }
  return parseHtmlClient(rawHtml);
}

function parseHtmlClient(rawHtml: string): ParsedDom {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const title = doc.title ?? "";

  // Meta tags
  const metaTags: Record<string, string> = {};
  doc.querySelectorAll("meta").forEach((meta) => {
    const name = meta.getAttribute("name") ?? meta.getAttribute("property") ?? "";
    const content = meta.getAttribute("content") ?? "";
    if (name) metaTags[name] = content;
  });

  // Headings
  const headings: string[] = [];
  doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
    const text = h.textContent?.trim();
    if (text) headings.push(text);
  });

  // Links
  const links: string[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href) links.push(href);
  });

  // Forms — capture per-form field presence for structural coexistence checks
  const forms: ParsedForm[] = [];
  doc.querySelectorAll("form").forEach((form) => {
    const formInputs = form.querySelectorAll("input,select,textarea");
    const hasSubmit = !!form.querySelector(
      "button[type='submit'],input[type='submit'],button:not([type])",
    );
    const hasPasswordInput = !!form.querySelector("input[type='password']");
    const hasTextInput = !!form.querySelector(
      "input[type='text'],input[type='email'],input:not([type])",
    );
    const inputIds: string[] = [];
    form.querySelectorAll("input[id]").forEach((el) => {
      const id = el.getAttribute("id");
      if (id) inputIds.push(id);
    });
    forms.push({
      action: form.getAttribute("action") ?? undefined,
      method: form.getAttribute("method") ?? undefined,
      inputCount: formInputs.length,
      hasSubmit,
      hasPasswordInput,
      hasTextInput,
      inputIds,
    });
  });

  // Inputs
  const inputs: ParsedInput[] = [];
  doc.querySelectorAll("input,select,textarea").forEach((input) => {
    inputs.push({
      type: input.getAttribute("type") ?? undefined,
      name: input.getAttribute("name") ?? undefined,
      id: input.getAttribute("id") ?? undefined,
      placeholder: input.getAttribute("placeholder") ?? undefined,
    });
  });

  // CSS classes
  const classSet = new Set<string>();
  doc.querySelectorAll("[class]").forEach((el) => {
    el.classList.forEach((cls) => classSet.add(cls));
  });

  // Tag frequency
  const tagFrequency: Record<string, number> = {};
  doc.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
  });

  const textContent = doc.body?.innerText ?? doc.body?.textContent ?? "";

  return {
    title,
    metaTags,
    headings,
    links,
    forms,
    inputs,
    cssClasses: Array.from(classSet),
    tagFrequency,
    textContent: textContent.trim(),
    rawHtml,
  };
}

// Minimal server-side parser using regex (no DOM access).
// Replace with cheerio on actual server routes.
function parseHtmlServer(rawHtml: string): ParsedDom {
  const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? "";

  const metaTags: Record<string, string> = {};
  const metaRegex = /<meta[^>]+>/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(rawHtml)) !== null) {
    const tag = metaMatch[0];
    const nameMatch = tag.match(/(?:name|property)="([^"]*)"/i);
    const contentMatch = tag.match(/content="([^"]*)"/i);
    if (nameMatch?.[1] && contentMatch?.[1]) {
      metaTags[nameMatch[1]] = contentMatch[1];
    }
  }

  const headings: string[] = [];
  const headingRegex = /<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(rawHtml)) !== null) {
    if (hMatch[1].trim()) headings.push(hMatch[1].trim());
  }

  const cssClasses: string[] = [];
  const classRegex = /class="([^"]*)"/gi;
  const classSet = new Set<string>();
  let classMatch;
  while ((classMatch = classRegex.exec(rawHtml)) !== null) {
    classMatch[1].split(/\s+/).forEach((c) => c && classSet.add(c));
  }
  cssClasses.push(...classSet);

  const tagFrequency: Record<string, number> = {};
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(rawHtml)) !== null) {
    const tag = tagMatch[1].toLowerCase();
    tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
  }

  const textContent = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return {
    title,
    metaTags,
    headings,
    links: [],
    forms: [],
    inputs: [],
    cssClasses,
    tagFrequency,
    textContent,
    rawHtml,
  };
}

export function extractHtmlFromMhtml(mhtmlContent: string): string {
  // MHTML is a multipart MIME document. Extract first text/html part.
  const boundary = extractMhtmlBoundary(mhtmlContent);
  if (!boundary) {
    // No boundary found — try returning as raw HTML
    return mhtmlContent;
  }

  const parts = mhtmlContent.split(`--${boundary}`);
  for (const part of parts) {
    if (part.toLowerCase().includes("content-type: text/html")) {
      // Strip MIME headers (blank line separates headers from body)
      const bodyStart = part.indexOf("\r\n\r\n");
      const bodyStart2 = part.indexOf("\n\n");
      const start = bodyStart !== -1 ? bodyStart + 4 : bodyStart2 !== -1 ? bodyStart2 + 2 : 0;
      const html = part.slice(start).trim();
      if (html.toLowerCase().includes("<html")) return html;
    }
  }

  return mhtmlContent;
}

function extractMhtmlBoundary(mhtml: string): string | null {
  const match = mhtml.match(/boundary="?([^"\r\n]+)"?/i);
  return match?.[1] ?? null;
}
