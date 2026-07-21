import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { trustDomainKeys, type TrustDomainDefinition, type TrustDomainKey } from "./domains.ts";

const effectiveAt = "2026-07-21T00:00:00.000Z";
const descriptions: Record<TrustDomainKey, [string, string]> = {
  IDENTITY: ["Identity", "Human and organization identity evidence."],
  AI_AGENT: ["AI agent", "Machine identity, delegation and authorization."],
  DEVICE: ["Device", "Device integrity and attestation."],
  AUTHORITY: ["Authority", "Authority grants and lineage."],
  WORKFLOW: ["Workflow", "Workflow participation and control integrity."],
  RUNTIME: ["Runtime", "Continuous execution and session observations."],
  NETWORK: ["Network", "Network posture and transport observations."],
  DATA: ["Data", "Data provenance, handling and integrity."],
  CONSENT: ["Consent", "Consent choices, receipts and policy state."],
  GOVERNANCE: ["Governance", "Policies, reviews, exceptions and audit state."],
};

export const trustDomainRegistry: readonly TrustDomainDefinition[] = trustDomainKeys.map((domainKey) => ({ domainKey, version: "1.0.0", displayName: descriptions[domainKey][0], description: descriptions[domainKey][1], active: true, effectiveAt }));

export function resolveTrustDomain(value: unknown): TrustDomainDefinition {
  if (typeof value !== "string" || !trustDomainKeys.includes(value as TrustDomainKey)) throw Object.assign(new Error("Unknown trust domain."), { code: "DOMAIN_UNKNOWN" });
  const domain = trustDomainRegistry.find((item) => item.domainKey === value && item.active);
  if (!domain) throw Object.assign(new Error("Trust domain is inactive."), { code: "DOMAIN_INACTIVE" });
  return { ...domain, effectiveAt: normalizeUtcTimestamp(domain.effectiveAt) };
}

export function isTrustDomainKey(value: unknown): value is TrustDomainKey {
  return typeof value === "string" && trustDomainKeys.includes(value as TrustDomainKey);
}
