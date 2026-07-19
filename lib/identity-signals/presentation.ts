import type { IdentitySignalStatus } from "./types";

export const identityUiStates = [
  "loading",
  "empty",
  "partial",
  "completed",
  "failed",
  "blocked",
  "unauthorized",
] as const;

export type IdentityUiState = (typeof identityUiStates)[number];

type EvidenceTruth = {
  provider_id?: string | null;
  signal_status?: IdentitySignalStatus | null;
  outcome?: string | null;
  server_verified?: boolean | null;
  signature_verified?: boolean | null;
  provider_reference?: string | null;
  provider_transaction_id?: string | null;
  source_digest?: string | null;
};

export function isStrictVerifiedEvidence(evidence: EvidenceTruth) {
  return evidence.signal_status === "PASS"
    && evidence.outcome === "VERIFIED"
    && evidence.server_verified === true
    && evidence.signature_verified === true
    && Boolean(evidence.provider_reference)
    && Boolean(evidence.provider_transaction_id)
    && Boolean(evidence.source_digest);
}

export function evidenceDisplayLabel(evidence: EvidenceTruth) {
  if (evidence.provider_id === "world_id") return "Proof received — server verification pending";
  if (evidence.provider_id === "hopae_connect" && isStrictVerifiedEvidence(evidence)) return "Signed and server verified";
  if (evidence.signal_status === "PASS") return "Pass — not independently verified";
  return evidence.signal_status ?? evidence.outcome ?? "INCONCLUSIVE";
}

export function identityRequestUiState(status: string, evidenceStatuses: string[] = []): Exclude<IdentityUiState, "loading" | "empty" | "unauthorized"> {
  if (status === "FAILED" || status === "CANCELLED") return "failed";
  if (evidenceStatuses.length > 0 && evidenceStatuses.every((value) => ["BLOCKED", "UNAVAILABLE", "UNSUPPORTED"].includes(value))) return "blocked";
  if (status === "COMPLETED") return "completed";
  return "partial";
}
