import { hashCanonical } from "../trust-core/hash.ts";
import type { ReviewerRole, SeriousIncidentAssessmentInput, SubmissionPackage, SubmissionPackageInput } from "./types.ts";
import { assertDataMinimized } from "./validation.ts";

const approvers = new Set<ReviewerRole>(["compliance_reviewer", "legal_reviewer", "executive_approver"]);

export function buildSubmissionPackage(input: { assessment: SeriousIncidentAssessmentInput; packageInput: SubmissionPackageInput; reviewerRole?: ReviewerRole | null; artifacts: Record<string, unknown> }): SubmissionPackage {
  assertDataMinimized(input, "packageBuild");
  if (input.packageInput.version < 1 || !Number.isInteger(input.packageInput.version)) throw Object.assign(new Error("Package version must be a positive integer."), { code: "PACKAGE_VERSION_INVALID" });
  if (["reviewer_approved", "regulator_ready", "submitted"].includes(input.packageInput.state)) {
    if (!input.packageInput.approvedByDecisionId || !input.reviewerRole || !approvers.has(input.reviewerRole)) throw Object.assign(new Error("Approved package state requires an authorized reviewer decision."), { code: "PACKAGE_APPROVAL_REQUIRED" });
  }
  const evidenceArtifacts = Object.fromEntries(Object.entries(input.artifacts).filter(([key]) => !["incident_submission_packages", "incident_external_submissions"].includes(key)).map(([key, value]) => [key, key === "incident_reviewer_decisions" && Array.isArray(value) ? value.filter((decision) => (decision as Record<string, unknown>).decision_type !== "submission_approval") : value]));
  const machineReadable: Record<string, unknown> = {
    schemaVersion: input.packageInput.exportSchemaVersion,
    incidentId: input.assessment.id,
    enterpriseId: input.assessment.enterpriseId,
    incidentSummary: input.packageInput.incidentSummary,
    identity: input.assessment.identity,
    regulatoryContext: input.assessment.regulatoryContext,
    clocks: input.assessment.clocks,
    references: input.assessment.references,
    evidenceSnapshot: input.assessment.evidenceSnapshot,
    evidenceIndex: input.packageInput.evidenceIndex,
    unresolvedUncertainty: input.packageInput.unresolvedUncertainty,
    evidenceIntegrityDigests: input.packageInput.evidenceIntegrityDigests,
    replayReference: input.packageInput.replayReference,
    trustMemoryReference: input.packageInput.trustMemoryReference,
    artifacts: evidenceArtifacts,
  };
  const humanReadableSummary = `${input.packageInput.incidentSummary}\n\nOperational screening and evidence package only. This package is not a legal conclusion, certification, or guarantee of legal sufficiency.`;
  const contentDigest = hashCanonical({ machineReadable, humanReadableSummary });
  const packageDigest = hashCanonical({
    packageId: input.packageInput.id,
    version: input.packageInput.version,
    state: input.packageInput.state,
    approvedByDecisionId: input.packageInput.approvedByDecisionId,
    supersedesPackageId: input.packageInput.supersedesPackageId,
    exportSchemaVersion: input.packageInput.exportSchemaVersion,
    exportedAt: input.packageInput.exportedAt,
    contentDigest,
    machineReadable,
    humanReadableSummary,
  });
  return {
    ...input.packageInput,
    contentDigest,
    packageDigest,
    machineReadable,
    humanReadableSummary,
  };
}

export function assertPackageMutation(existing: SubmissionPackage, proposed: SubmissionPackageInput) {
  if (["reviewer_approved", "regulator_ready", "submitted", "superseded"].includes(existing.state)) throw Object.assign(new Error("Approved packages are immutable; create a superseding version."), { status: 409, code: "PACKAGE_IMMUTABLE" });
  if (existing.id !== proposed.id) throw Object.assign(new Error("Package identity mismatch."), { status: 409, code: "PACKAGE_ID_CONFLICT" });
}

export function assertSupersedingPackage(previous: Pick<SubmissionPackage, "id" | "version">, next: SubmissionPackageInput) {
  if (next.supersedesPackageId !== previous.id || next.version !== previous.version + 1) throw Object.assign(new Error("A superseding package must link the prior package and increment its version exactly once."), { status: 409, code: "PACKAGE_SUPERSESSION_INVALID" });
  return next;
}
