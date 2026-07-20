import type { ConsensusPolicy } from "./types.ts";

export const defaultConsensusPolicy: ConsensusPolicy = {
  policyId: "provider-consensus-default", version: "2026-07-20.1", name: "Safe provider consensus", active: true,
  verifiedThreshold: 75, trustedThreshold: 50, blockingThreshold: 0.65,
  minimumIndependentGroupsVerified: 2, minimumIndependentGroupsTrusted: 1,
  mandatorySignals: ["identity_verification"], materialConflictOutcome: "CHALLENGED", criticalRevocationOutcome: "REVOKED",
  staleEvidenceMode: "ZERO", correlationPenalty: 0.25,
  signalMultipliers: { identity_verification: 1, document_verification: 0.85, government_identity: 1, proof_of_personhood: 0.4, device_reputation: 0.7, authority: 1 },
  validFrom: "2026-07-20T00:00:00.000Z",
};
