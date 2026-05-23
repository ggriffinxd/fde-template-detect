import { z } from "zod";

export const XPathRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.string().min(1),
  weight: z.number().min(0).max(100),
  required: z.boolean(),
  description: z.string().optional(),
});

// "host" is accepted as alias for "hostname" for import compatibility
export const UrlPatternSchema = z.object({
  id: z.string().min(1),
  pattern: z.string().min(1),
  type: z.preprocess(
    (v) => (v === "host" ? "hostname" : v),
    z.enum(["exact", "partial", "regex", "hostname", "path"]),
  ),
  weight: z.number().min(0).max(100),
});

export const DomFingerprintSchema = z.object({
  id: z.string().min(1),
  selector: z.string().min(1),
  type: z.enum(["css", "tag", "attribute", "structure"]),
  weight: z.number().min(0).max(100),
});

export const VisualFingerprintSchema = z.object({
  id: z.string().min(1),
  screenshotRef: z.string(),
  hash: z.string().optional(),
  description: z.string().optional(),
});

// All weights are optional. When a template provides ANY explicit weights,
// unspecified dimensions default to 0 in the scoring engine (not the global defaults).
// This preserves the template designer's intent: e.g. {xpathValidation:50, urlSimilarity:50}
// means "only these two dimensions matter" — not "these two plus the global defaults".
export const ScoringWeightsSchema = z.object({
  domStructure:       z.number().min(0).max(100).optional(),
  xpathValidation:    z.number().min(0).max(100).optional(),
  urlSimilarity:      z.number().min(0).max(100).optional(),
  semanticSimilarity: z.number().min(0).max(100).optional(),
  visualSimilarity:   z.number().min(0).max(100).optional(),
});

export const StructuralRequirementsSchema = z.object({
  hasPasswordInput:  z.boolean().optional(),
  hasForm:           z.boolean().optional(),
  hasSubmit:         z.boolean().optional(),
  hasUsernameInput:  z.boolean().optional(),
  hasLoginForm:      z.boolean().optional(),
});

export const BankTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  referenceUrls: z.array(z.string()).default([]),
  urlPatterns: z.array(UrlPatternSchema).default([]),
  xpaths: z.array(XPathRuleSchema).default([]),
  cssIndicators: z.array(z.string()).default([]),
  semanticKeywords: z.array(z.string()).default([]),
  visualFingerprints: z.array(VisualFingerprintSchema).default([]),
  domFingerprints: z.array(DomFingerprintSchema).default([]),
  scoringWeights: ScoringWeightsSchema.optional(),
  // IDs of XPathRules that ALL must be found; any miss caps the score at 20.
  criticalXpaths: z.array(z.string()).optional().default([]),
  // Minimum number of `required:true` XPaths that must match; shortfall caps at 30.
  minimumRequiredMatches: z.number().min(0).optional(),
  structuralRequirements: StructuralRequirementsSchema.optional(),
  tags: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const TemplateRegistrySchema = z.object({
  version: z.string().default("1.0.0"),
  updatedAt: z.string().default(() => new Date().toISOString()),
  templates: z.array(BankTemplateSchema),
});

export const VerificationPayloadSchema = z.object({
  targetUrl: z.string().url().optional(),
  htmlContent: z.string().optional(),
  mhtmlContent: z.string().optional(),
  fileName: z.string().optional(),
  sourceType: z.enum(["upload", "url"]),
});

export type XPathRuleInput = z.infer<typeof XPathRuleSchema>;
export type BankTemplateInput = z.infer<typeof BankTemplateSchema>;
export type TemplateRegistryInput = z.infer<typeof TemplateRegistrySchema>;

// Human-readable description of what's wrong in a ZodError
export function describeZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(" · ");
}
