import { createHash } from "node:crypto";

// Enterprise context may inform a policy decision but never grants authority.
// Only a signed system of record or a named human attestation is trusted;
// LLM assertions, inferred relationships and unverified documents are not.

export const ENTERPRISE_CONTEXT_VERSION = "enterprise-context-v1" as const;

export type ContextSourceKind = "SYSTEM_OF_RECORD" | "HUMAN_ATTESTATION" | "LLM_ASSERTION" | "INFERRED" | "UNVERIFIED_DOCUMENT";
export type ContextOutcome = "SATISFIED" | "INSUFFICIENT_EVIDENCE" | "REVIEW_REQUIRED" | "CONFIRMED_DENY";
export type PolicyDecision = "ALLOW" | "REVIEW" | "DENY";

export type ContextFact = {
  tenantId: string;
  key: string;
  value: string | number | boolean;
  version: string;
  source: { kind: ContextSourceKind; id: string };
  observedAt: string;
  expiresAt: string;
  digest: string;
};

export type ContextRequirement = {
  key: string;
  equals: string | number | boolean;
  onInsufficient?: PolicyDecision;
};

export type ContextEvaluation = {
  outcome: ContextOutcome;
  reasonCodes: string[];
  factDigests: string[];
  grantsAuthority: false;
  version: typeof ENTERPRISE_CONTEXT_VERSION;
};

const trustedKinds: ReadonlySet<ContextSourceKind> = new Set(["SYSTEM_OF_RECORD", "HUMAN_ATTESTATION"]);

export function contextFactDigest(fact: Omit<ContextFact, "digest">) {
  return createHash("sha256")
    .update(JSON.stringify([fact.tenantId, fact.key, fact.value, fact.version, fact.source.kind, fact.source.id, fact.observedAt, fact.expiresAt]))
    .digest("hex");
}

export function evaluateContextRequirement(input: {
  tenantId: string;
  requirement: ContextRequirement;
  facts: readonly ContextFact[];
  now: string;
}): ContextEvaluation {
  const now = Date.parse(input.now);
  const reasons = new Set<string>();
  const usable: ContextFact[] = [];
  const result = (outcome: ContextOutcome, factDigests: string[] = []): ContextEvaluation => ({
    outcome,
    reasonCodes: [...reasons],
    factDigests,
    grantsAuthority: false,
    version: ENTERPRISE_CONTEXT_VERSION,
  });
  if (!Number.isFinite(now)) {
    reasons.add("CONTEXT_CLOCK_INVALID");
    return result("INSUFFICIENT_EVIDENCE");
  }
  for (const fact of input.facts) {
    if (fact.key !== input.requirement.key) continue;
    if (fact.tenantId !== input.tenantId) {
      reasons.add("CONTEXT_TENANT_MISMATCH");
      continue;
    }
    if (!trustedKinds.has(fact.source.kind)) {
      reasons.add("CONTEXT_SOURCE_NOT_AUTHORITATIVE");
      continue;
    }
    if (fact.digest !== contextFactDigest(fact)) {
      reasons.add("CONTEXT_INTEGRITY_FAILED");
      continue;
    }
    const observed = Date.parse(fact.observedAt);
    const expires = Date.parse(fact.expiresAt);
    if (!Number.isFinite(observed) || !Number.isFinite(expires) || observed > now || expires <= now) {
      reasons.add("CONTEXT_STALE_OR_NOT_YET_VALID");
      continue;
    }
    usable.push(fact);
  }
  if (usable.length === 0) {
    reasons.add("CONTEXT_EVIDENCE_MISSING");
    return result("INSUFFICIENT_EVIDENCE");
  }
  const digests = usable.map((fact) => fact.digest).sort();
  if (new Set(usable.map((fact) => JSON.stringify(fact.value))).size > 1) {
    reasons.add("CONTEXT_CONTRADICTORY");
    return result("REVIEW_REQUIRED", digests);
  }
  if (usable[0].value !== input.requirement.equals) {
    reasons.add("CONTEXT_VALUE_MISMATCH");
    return result("CONFIRMED_DENY", digests);
  }
  reasons.add("CONTEXT_SATISFIED");
  return result("SATISFIED", digests);
}

// The authority decision is the ceiling: context can only keep or lower it.
export function combineAuthorityWithContext(
  authority: PolicyDecision,
  context: ContextEvaluation,
  onInsufficient: PolicyDecision = "DENY",
): { decision: PolicyDecision; reasonCodes: string[] } {
  const reasonCodes = [...context.reasonCodes];
  if (authority === "DENY") return { decision: "DENY", reasonCodes };
  if (context.outcome === "CONFIRMED_DENY") return { decision: "DENY", reasonCodes };
  if (context.outcome === "REVIEW_REQUIRED") return { decision: "REVIEW", reasonCodes };
  if (context.outcome === "INSUFFICIENT_EVIDENCE") return { decision: onInsufficient, reasonCodes };
  return { decision: authority, reasonCodes };
}
