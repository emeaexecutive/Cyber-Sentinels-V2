import { hashCanonical } from "../trust-core/hash.ts";
import type { TrustLearningSnapshot, TrustResilienceAssessment } from "./types.ts";

export function assessTrustResilience(input: { snapshot: TrustLearningSnapshot; providerReference?: string | null }): TrustResilienceAssessment {
  const workflows = input.providerReference ? input.snapshot.workflows.filter((workflow) => workflow.providerReferences.includes(input.providerReference!)) : input.snapshot.workflows;
  const independentEvidence = [...new Set(workflows.flatMap((workflow) => workflow.evidenceReferences))].sort();
  const affectedObjects = input.snapshot.trustObjects.filter((object) => object.workflowReferences?.some((reference) => workflows.some((workflow) => workflow.reference === reference))).map((object) => object.reference).sort();
  const authorityReferences = [...new Set(workflows.flatMap((workflow) => workflow.authorityReferences))];
  const unresolvedIncidentReferences = input.snapshot.incidents.filter((incident) => !incident.resolved).map((incident) => incident.reference).sort();
  const authorityReconstructable = authorityReferences.length > 0 && authorityReferences.every((reference) => input.snapshot.authorities.some((authority) => authority.reference === reference));
  const providerSets = workflows.map((workflow) => new Set(workflow.providerReferences.filter((reference) => reference !== input.providerReference)));
  const alternateProviderPresent = providerSets.every((providers) => providers.size > 0);
  const state = workflows.length === 0 ? "unknown" as const
    : !authorityReconstructable ? "authority_gap" as const
      : independentEvidence.length === 0 ? "evidence_gap" as const
        : unresolvedIncidentReferences.length ? "recovery_required" as const
          : !alternateProviderPresent ? "single_source_dependency" as const
          : "resilient" as const;
  const body = {
    state,
    providerReference: input.providerReference ?? null,
    independentEvidenceReferences: independentEvidence,
    affectedObjects,
    affectedWorkflows: workflows.map((workflow) => workflow.reference).sort(),
    authorityReconstructable,
    replayAvailable: workflows.length > 0 && independentEvidence.length > 0,
    businessOutcomeEstablished: false,
    unresolvedIncidentReferences,
    limitations: ["No redundancy is inferred without an approved independent source.", "Business outcomes remain unconfirmed unless canonical outcome evidence exists."],
    sourceReferences: [...new Set([...independentEvidence, ...authorityReferences, ...(input.providerReference ? [input.providerReference] : [])])].sort(),
  };
  return { ...body, digest: hashCanonical(body) };
}
