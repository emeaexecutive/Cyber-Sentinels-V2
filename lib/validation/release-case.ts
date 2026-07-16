export const RELEASE_VALIDATION_REVIEW_STATUSES = ["pending", "reviewed", "disputed", "excluded", "approved"] as const;
export type ReleaseValidationReviewStatus = typeof RELEASE_VALIDATION_REVIEW_STATUSES[number];
export type ReleaseValidationDecision = "allow" | "step_up" | "review" | "block" | "abstain" | "insufficient_evidence";

export type ReleaseValidationCase = {
  caseId: string;
  datasetId: string;
  datasetVersion: string;
  entityType: "human" | "ai_agent" | "machine_identity" | "workflow";
  workflowType: string;
  signalType: string;
  evidenceMode: "synthetic_fixture" | "provider_sandbox" | "consented_internal" | "licensed_public_benchmark";
  evidenceReferences: string[];
  expectedDecision: ReleaseValidationDecision;
  actualDecision: ReleaseValidationDecision | null;
  groundTruthLabel: string | null;
  reviewStatus: ReleaseValidationReviewStatus;
  reviewerId: string | null;
  reviewerRole: string | null;
  reviewTimestamp: string | null;
  reviewerConfidence: number | null;
  rationale: string | null;
  provenance: string;
  licenceBoundary: string;
  limitations: string[];
  rulesetVersion: string;
  providerVersions: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

const decisions = new Set<ReleaseValidationDecision>(["allow", "step_up", "review", "block", "abstain", "insufficient_evidence"]);
const statuses = new Set<string>(RELEASE_VALIDATION_REVIEW_STATUSES);
const entityTypes = new Set(["human", "ai_agent", "machine_identity", "workflow"]);
const evidenceModes = new Set(["synthetic_fixture", "provider_sandbox", "consented_internal", "licensed_public_benchmark"]);
const referencePattern = /^[a-zA-Z0-9_.:/-]{3,200}$/;

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`);
  return value.trim();
}

function isoTimestamp(value: unknown, name: string, nullable = false) {
  if (nullable && value === null) return null;
  const text = requiredString(value, name);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${name} must be an ISO timestamp.`);
  return text;
}

export function parseReleaseValidationCase(value: unknown): ReleaseValidationCase {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Validation case must be an object.");
  const item = value as Record<string, unknown>;
  const caseId = requiredString(item.caseId, "caseId");
  const expectedDecision = requiredString(item.expectedDecision, "expectedDecision") as ReleaseValidationDecision;
  if (!decisions.has(expectedDecision)) throw new Error("expectedDecision is unsupported.");
  const actualDecision = item.actualDecision === null ? null : requiredString(item.actualDecision, "actualDecision") as ReleaseValidationDecision;
  if (actualDecision !== null && !decisions.has(actualDecision)) throw new Error("actualDecision is unsupported.");
  const reviewStatus = requiredString(item.reviewStatus, "reviewStatus") as ReleaseValidationReviewStatus;
  if (!statuses.has(reviewStatus)) throw new Error("reviewStatus is unsupported.");
  const entityType = requiredString(item.entityType, "entityType") as ReleaseValidationCase["entityType"];
  if (!entityTypes.has(entityType)) throw new Error("entityType is unsupported.");
  const evidenceMode = requiredString(item.evidenceMode, "evidenceMode") as ReleaseValidationCase["evidenceMode"];
  if (!evidenceModes.has(evidenceMode)) throw new Error("evidenceMode is unsupported.");
  if (!Array.isArray(item.evidenceReferences) || !item.evidenceReferences.length || item.evidenceReferences.some((ref) => typeof ref !== "string" || !referencePattern.test(ref))) throw new Error("evidenceReferences must contain safe references.");
  if (!Array.isArray(item.limitations) || item.limitations.some((entry) => typeof entry !== "string" || !entry.trim())) throw new Error("limitations must be a string array.");
  if (!item.providerVersions || typeof item.providerVersions !== "object" || Array.isArray(item.providerVersions)) throw new Error("providerVersions is required.");
  const reviewerConfidence = item.reviewerConfidence === null ? null : Number(item.reviewerConfidence);
  if (reviewerConfidence !== null && (!Number.isFinite(reviewerConfidence) || reviewerConfidence < 0 || reviewerConfidence > 1)) throw new Error("reviewerConfidence must be from 0 to 1.");
  const reviewerId = item.reviewerId === null ? null : requiredString(item.reviewerId, "reviewerId");
  const reviewerRole = item.reviewerRole === null ? null : requiredString(item.reviewerRole, "reviewerRole");
  const reviewTimestamp = isoTimestamp(item.reviewTimestamp, "reviewTimestamp", true);
  const rationale = item.rationale === null ? null : requiredString(item.rationale, "rationale");
  const groundTruthLabel = item.groundTruthLabel === null ? null : requiredString(item.groundTruthLabel, "groundTruthLabel");
  if (reviewStatus === "approved" && (!groundTruthLabel || (!reviewerId && !reviewerRole) || !reviewTimestamp || reviewerConfidence === null || !rationale)) throw new Error("Approved cases require ground truth, reviewer attribution, timestamp, confidence and rationale.");
  if (reviewStatus === "pending" && (groundTruthLabel || reviewerId || reviewerRole || reviewTimestamp || reviewerConfidence !== null || rationale)) throw new Error("Pending fixtures cannot carry review conclusions.");

  return {
    caseId,
    datasetId: requiredString(item.datasetId, "datasetId"),
    datasetVersion: requiredString(item.datasetVersion, "datasetVersion"),
    entityType,
    workflowType: requiredString(item.workflowType, "workflowType"),
    signalType: requiredString(item.signalType, "signalType"),
    evidenceMode,
    evidenceReferences: item.evidenceReferences as string[],
    expectedDecision,
    actualDecision,
    groundTruthLabel,
    reviewStatus,
    reviewerId,
    reviewerRole,
    reviewTimestamp,
    reviewerConfidence,
    rationale,
    provenance: requiredString(item.provenance, "provenance"),
    licenceBoundary: requiredString(item.licenceBoundary, "licenceBoundary"),
    limitations: item.limitations as string[],
    rulesetVersion: requiredString(item.rulesetVersion, "rulesetVersion"),
    providerVersions: Object.fromEntries(Object.entries(item.providerVersions as Record<string, unknown>).map(([key, version]) => [requiredString(key, "provider name"), requiredString(version, "provider version")])),
    createdAt: isoTimestamp(item.createdAt, "createdAt")!,
    updatedAt: isoTimestamp(item.updatedAt, "updatedAt")!,
  };
}

export function parseReleaseValidationCases(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Validation fixture file must contain an array.");
  const cases = value.map(parseReleaseValidationCase);
  if (new Set(cases.map((item) => item.caseId)).size !== cases.length) throw new Error("Validation case IDs must be unique.");
  return cases;
}
