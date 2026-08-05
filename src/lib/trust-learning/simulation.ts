import { hashCanonical } from "../trust-core/hash.ts";
import type { TrustLearningSnapshot, TrustSimulationResult } from "./types.ts";

export function simulateTrustSnapshot(input: { snapshot: TrustLearningSnapshot; simulationType: TrustSimulationResult["simulationType"]; targetReference: string }): TrustSimulationResult {
  const snapshotDigest = hashCanonical(input.snapshot);
  const affectedWorkflows = input.snapshot.workflows.filter((workflow) => {
    if (input.simulationType === "provider_outage") return workflow.providerReferences.includes(input.targetReference);
    if (input.simulationType === "authority_expiry" || input.simulationType === "delegated_agent_impact") return workflow.authorityReferences.includes(input.targetReference);
    return false;
  });
  const affectedObjects = input.snapshot.trustObjects.filter((object) =>
    object.authorityReference === input.targetReference || object.providerReferences?.includes(input.targetReference) || object.workflowReferences?.some((reference) => affectedWorkflows.some((workflow) => workflow.reference === reference))
  ).map((object) => object.reference).sort();
  const sourceReferences = [...new Set([input.targetReference, ...affectedWorkflows.flatMap((workflow) => [...workflow.authorityReferences, ...workflow.providerReferences, ...workflow.evidenceReferences])])].sort();
  const body = {
    simulationType: input.simulationType,
    assumptions: [`${input.targetReference} is unavailable for the complete bounded snapshot.`, "Existing policy requirements remain unchanged."],
    affectedObjects,
    affectedWorkflows: affectedWorkflows.map((workflow) => workflow.reference).sort(),
    changedDecisions: affectedWorkflows.map((workflow) => ({ workflowReference: workflow.reference, from: workflow.decision, to: workflow.decision === "deny" ? "deny" as const : "review" as const })),
    uncertainty: ["This deterministic simulation does not predict future behavior.", "Effects outside the captured snapshot are unknown."],
    sourceReferences,
    canonicalStateMutationCount: 0 as const,
    snapshotDigest,
  };
  return { ...body, simulationDigest: hashCanonical(body) };
}
