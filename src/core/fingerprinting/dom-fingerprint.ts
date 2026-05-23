import type { ParsedDom } from "@/types";

// DOM Fingerprinting — generates a structural hash for template identification.

export interface DomFingerprintData {
  hash: string;
  tagSignature: string;
  formSignature: string;
  inputSignature: string;
  classSignature: string;
  structureDepth: number;
  uniqueClasses: number;
}

export function generateDomFingerprint(parsed: ParsedDom): DomFingerprintData {
  const tagSignature = Object.entries(parsed.tagFrequency)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, count]) => `${tag}:${count}`)
    .join("|");

  const formSignature = parsed.forms
    .map((f) => `f:${f.inputCount}:${f.hasSubmit ? 1 : 0}`)
    .join("|");

  const inputSignature = parsed.inputs
    .map((i) => `${i.type ?? "?"}:${i.name ?? "?"}`)
    .sort()
    .join("|");

  // Top 20 most relevant class names
  const classSignature = parsed.cssClasses
    .filter((c) => c.length > 2 && !c.match(/^[0-9]/))
    .slice(0, 20)
    .sort()
    .join(",");

  const structureDepth = estimateDepth(parsed.rawHtml);
  const uniqueClasses = new Set(parsed.cssClasses).size;

  const raw = `${tagSignature}||${formSignature}||${inputSignature}||${classSignature}`;
  const hash = simpleHash(raw);

  return {
    hash,
    tagSignature,
    formSignature,
    inputSignature,
    classSignature,
    structureDepth,
    uniqueClasses,
  };
}

function estimateDepth(html: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  const voidTags = new Set(["br", "hr", "img", "input", "link", "meta", "area", "base", "col", "embed", "param", "source", "track", "wbr"]);
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    if (voidTags.has(tag) || full.endsWith("/>")) continue;
    if (full.startsWith("</")) {
      currentDepth = Math.max(0, currentDepth - 1);
    } else {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    }
  }

  return maxDepth;
}

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
