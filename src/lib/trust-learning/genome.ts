import { hashCanonical } from "../trust-core/hash.ts";
import type { EnterpriseTrustPattern } from "./types.ts";

export function deriveEnterpriseTrustGenome(input: { enterpriseId: string; patterns: EnterpriseTrustPattern[]; version: string; generatedAt: string }) {
  const tenantPatterns = input.patterns.filter((pattern) => pattern.enterpriseId === input.enterpriseId);
  const dimensions = ["identity", "authority", "policy", "provider", "environment", "workflow", "incident", "recovery", "outcome", "economic_authority"].map((dimension) => ({
    dimension,
    patternReferences: tenantPatterns.filter((pattern) => pattern.patternType.includes(dimension) || (dimension === "recovery" && pattern.patternType.includes("restoration"))).map((pattern) => pattern.patternId).sort(),
  }));
  const source = {
    enterpriseId: input.enterpriseId,
    version: input.version,
    generatedAt: input.generatedAt,
    dimensions,
    sourceReferences: [...new Set(tenantPatterns.flatMap((pattern) => pattern.evidenceReferences))].sort(),
    customerOwned: true,
    tenantBound: true,
    exportable: true,
    correctable: true,
    universalScore: null,
    crossCustomerLearning: false,
    limitations: ["This is a versioned derived profile, not biometric identity, a hidden score or a canonical decision."],
  };
  return { ...source, digest: hashCanonical(source) };
}
