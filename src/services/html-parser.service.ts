import type { ParsedDom } from "@/types";
import { parseHtml, extractHtmlFromMhtml } from "@/core/parsers/html-parser";
import { generateDomFingerprint } from "@/core/fingerprinting/dom-fingerprint";

export interface ParseResult {
  parsedDom: ParsedDom;
  fingerprint: ReturnType<typeof generateDomFingerprint>;
  sourceType: "html" | "mhtml";
}

class HtmlParserService {
  async parseHtmlContent(html: string): Promise<ParseResult> {
    // FUTURE: await apiClient.post("/parse/html", { content: html })
    const parsedDom = parseHtml(html);
    const fingerprint = generateDomFingerprint(parsedDom);
    return { parsedDom, fingerprint, sourceType: "html" };
  }

  async parseMhtmlContent(mhtml: string): Promise<ParseResult> {
    // FUTURE: await apiClient.post("/parse/mhtml", { content: mhtml })
    const html = extractHtmlFromMhtml(mhtml);
    const parsedDom = parseHtml(html);
    const fingerprint = generateDomFingerprint(parsedDom);
    return { parsedDom, fingerprint, sourceType: "mhtml" };
  }

  async parseFile(file: File): Promise<ParseResult> {
    const content = await file.text();
    const isMhtml =
      file.name.endsWith(".mhtml") ||
      file.type === "message/rfc822" ||
      content.startsWith("MIME-Version:");

    if (isMhtml) {
      return this.parseMhtmlContent(content);
    }
    return this.parseHtmlContent(content);
  }
}

export const htmlParserService = new HtmlParserService();
