import type { CanonicalReference, CanonicalTrustDecision, CitedStatement } from "./types.ts";

export const specialistDecisionCapabilities = [
  "DECISION_SIMILARITY",
  "EVIDENCE_RANKING",
  "POLICY_RECOMMENDATION",
  "RECOVERY_RECOMMENDATION",
  "REVIEWER_ASSISTANCE",
] as const;

export type SpecialistDecisionCapability = (typeof specialistDecisionCapabilities)[number];

export type SpecialistModelRequest = {
  requestId: string;
  capability: SpecialistDecisionCapability;
  decisionReference: CanonicalReference;
  permittedEvidenceIds: string[];
  provider?: string;
  model?: string;
};

export type SpecialistModelResponse = {
  requestId: string;
  capability: SpecialistDecisionCapability;
  recommendations: CitedStatement[];
  uncertainty: string[];
  authoritative: false;
  mutatesTrust: false;
  mutatesPolicy: false;
  mutatesAuthority: false;
  createsEvidence: false;
};

/** Creates a data-minimized interface request; it never invokes or trains a model. */
export function prepareSpecialistModelRequest(input: {
  requestId: string;
  capability: SpecialistDecisionCapability;
  decision: CanonicalTrustDecision;
  permittedEvidenceIds?: string[];
  provider?: string;
  model?: string;
}): SpecialistModelRequest {
  const available = new Set(input.decision.supportingEvidence.map((item) => item.evidenceId));
  const permittedEvidenceIds = input.permittedEvidenceIds ?? [...available];
  if (permittedEvidenceIds.some((id) => !available.has(id))) throw new TypeError("A specialist model request cannot include evidence outside the canonical decision.");
  return {
    requestId: input.requestId,
    capability: input.capability,
    decisionReference: { system: "TRUST_FABRIC", id: input.decision.decisionId, version: input.decision.schemaVersion },
    permittedEvidenceIds,
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.model ? { model: input.model } : {}),
  };
}
export function validateSpecialistModelResponse(response: SpecialistModelResponse, decision: CanonicalTrustDecision): SpecialistModelResponse {
  const evidence = new Set(decision.supportingEvidence.map((item) => item.evidenceId));
  if (response.authoritative !== false || response.mutatesTrust !== false || response.mutatesPolicy !== false || response.mutatesAuthority !== false || response.createsEvidence !== false) throw new TypeError("Specialist model responses must remain advisory and non-mutating.");
  if (response.recommendations.some((item) => !item.evidenceIds.length || item.evidenceIds.some((id) => !evidence.has(id)))) throw new TypeError("Specialist model recommendations must cite canonical evidence.");
  return response;
}
