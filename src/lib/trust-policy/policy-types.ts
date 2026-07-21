import type { JsonValue } from "../trust-core/types.ts";

export const policyLayers = ["PLATFORM_DEFAULT", "ENTERPRISE_OVERRIDE", "DOMAIN_POLICY", "WORKFLOW_POLICY", "AUTHORITY_POLICY", "RUNTIME_EXCEPTION"] as const;
export type PolicyLayer = (typeof policyLayers)[number];
export type TrustPolicyVersion = {
  policyId: string; version: string; layer: PolicyLayer; enterpriseId?: string; domainKey?: string; workflowId?: string; authorityId?: string;
  active: boolean; validFrom: string; validUntil?: string; rules: Record<string, JsonValue>;
};
export type ResolvedTrustPolicy = { versions: TrustPolicyVersion[]; rules: Record<string, JsonValue>; resolutionHash: string };
