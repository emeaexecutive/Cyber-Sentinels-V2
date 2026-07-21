export const trustReasonCodes = [
  "CONSENSUS_RECOMMENDATION_CREATED",
  "DOMAIN_UNKNOWN",
  "EVIDENCE_EXPIRED",
  "EVIDENCE_INSUFFICIENT",
  "INVALID_STATE_TRANSITION",
  "PLACEHOLDER_PROVIDER_ZERO_WEIGHT",
  "POLICY_INVALID",
  "REVOKED_STATE_IRREVERSIBLE",
  "STATE_TRANSITION_APPLIED",
  "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED",
] as const;

export type TrustReasonCode = (typeof trustReasonCodes)[number] | (string & {});

export function normalizeReasonCodes(values: readonly string[]): string[] {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  if (normalized.some((value) => !/^[A-Z0-9][A-Z0-9_.:-]{0,127}$/.test(value))) throw new TypeError("Reason code is invalid.");
  return normalized;
}
