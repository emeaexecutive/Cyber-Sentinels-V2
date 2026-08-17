import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { OperationalEntity } from "./operational-entity.ts";

export const CAPABILITY_GOVERNANCE_VERSION = "capability-governance-v1" as const;
export const CAPABILITY_REAUTHORIZATION_VERSION = "capability-reauthorization-v1" as const;

export type OpenClosedClassification =
  | "open_weight"
  | "closed_weight"
  | "hosted_api"
  | "self_hosted"
  | "hybrid"
  | "unknown";

export type CapabilityGovernanceState = "PASS" | "REVIEW" | "FAIL" | "UNKNOWN";
export type CapabilityAuthorityImpact = "UNCHANGED" | "REVIEW_REQUIRED" | "REAUTHORIZATION_REQUIRED" | "DENY";
export type CapabilityGovernanceDecision = "ALLOW" | "REVIEW" | "DENY";

export type CapabilityAssessment = {
  assessmentId: string;
  enterpriseId: string;
  operationalEntityId: string;
  assessmentProvider: string;
  sourcePartyId: string;
  assessmentType: string;
  capabilityClass: string;
  capabilityThreshold: string;
  capabilityDimensions: Record<string, string | number | boolean>;
  evaluationReference: string;
  environmentReference: string;
  assessedModelId: string;
  assessedModelVersion: string;
  assessedModelHash: string | null;
  assessmentTimestamp: string;
  validFrom: string;
  validUntil: string | null;
  evidenceDigest: string;
  confidence: number | null;
  attribution: string;
};

export type ModelEnvironmentAttestation = {
  attestationReference: string;
  enterpriseId: string;
  environment: string;
  runtimeReference: string;
  hostingOperator: string;
  toolSet: string[];
  observedAt: string;
  expiresAt: string | null;
  evidenceProvider: string;
  sourcePartyId: string;
  evidenceDigest: string;
};

export type ModelGovernanceProjection = {
  enterpriseId: string;
  operationalEntityId: string;
  modelId: string;
  modelVersion: string;
  modelHash: string | null;
  fineTuneReference: string | null;
  deploymentOrigin: string;
  hostingOperator: string;
  modelFamily: string | null;
  openClosedClassification: OpenClosedClassification;
  capabilityAssessments: CapabilityAssessment[];
  applicableOversightRegimes: string[];
  safeguardsActive: string[];
  environmentAttestation: ModelEnvironmentAttestation | null;
  enterpriseRiskClassification: string;
  evidenceTimestamp: string;
  evidenceExpiry: string | null;
  continuityReference: string | null;
  permissionScope: string[];
};

export type CapabilityGovernancePolicy = {
  policyReference: string;
  requestedAction: string;
  requiredCapabilityClass: string;
  allowedCapabilityClasses: string[];
  requiredSafeguards: string[];
  requireModelHash: boolean;
  requireEnvironmentAttestation: boolean;
  requireHumanReviewForEvidenceConflict: boolean;
  denyWhenSafeguardMissing: boolean;
  denyReauthorizationTriggers?: string[];
};

export type CapabilityReauthorizationResult = {
  disposition: CapabilityAuthorityImpact;
  triggers: string[];
  materialChange: boolean;
};

export type CapabilityGovernanceDecisionSnapshot = Readonly<{
  algorithmVersion: typeof CAPABILITY_GOVERNANCE_VERSION;
  reauthorizationAlgorithmVersion: typeof CAPABILITY_REAUTHORIZATION_VERSION;
  evaluatedAt: string;
  operationalEntityId: string;
  model: Readonly<{
    modelId: string;
    modelVersion: string;
    modelHash: string | null;
    fineTuneReference: string | null;
    modelFamily: string | null;
    deploymentOrigin: string;
    hostingOperator: string;
    openClosedClassification: OpenClosedClassification;
  }>;
  capabilityAssessmentReferences: readonly string[];
  environmentAttestationReference: string | null;
  safeguardState: readonly string[];
  oversightRegimes: readonly string[];
  authorityImpact: CapabilityAuthorityImpact;
  reauthorizationTriggers: readonly string[];
  status: CapabilityGovernanceState;
  decision: CapabilityGovernanceDecision;
  reasonCodes: readonly string[];
  evidenceReferences: readonly string[];
  digest: string;
}>;

export type CapabilityGovernanceEvaluation = {
  status: CapabilityGovernanceState;
  decision: CapabilityGovernanceDecision;
  reasonCodes: string[];
  evidenceReferences: string[];
  authorityImpact: CapabilityAuthorityImpact;
  reauthorization: CapabilityReauthorizationResult;
  snapshot: CapabilityGovernanceDecisionSnapshot;
};

const digestPattern = /^[a-f0-9]{64}$/;

function time(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validTime(value: string | null) {
  return value === null || Number.isFinite(time(value));
}

function unique(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return unique(left).join("\u0000") === unique(right).join("\u0000");
}

function assessmentIsAttributed(assessment: CapabilityAssessment) {
  return Boolean(
    assessment.assessmentProvider
    && assessment.sourcePartyId
    && assessment.attribution
    && assessment.evaluationReference
    && validTime(assessment.assessmentTimestamp)
    && validTime(assessment.validFrom)
    && validTime(assessment.validUntil)
    && digestPattern.test(assessment.evidenceDigest),
  );
}

function assessmentsConflict(assessments: readonly CapabilityAssessment[]) {
  if (assessments.length < 2) return false;
  const materialClaims = new Set(assessments.map((assessment) => hashCanonical({
    capabilityClass: assessment.capabilityClass,
    capabilityThreshold: assessment.capabilityThreshold,
    capabilityDimensions: assessment.capabilityDimensions,
  })));
  return materialClaims.size > 1;
}

export function evaluateCapabilityReauthorization(input: {
  previous: ModelGovernanceProjection | null;
  current: ModelGovernanceProjection;
  policy: CapabilityGovernancePolicy;
  evaluatedAt: string;
}): CapabilityReauthorizationResult {
  if (!input.previous) return { disposition: "UNCHANGED", triggers: [], materialChange: false };
  if (input.previous.enterpriseId !== input.current.enterpriseId || input.previous.operationalEntityId !== input.current.operationalEntityId) {
    return { disposition: "DENY", triggers: ["CROSS_TENANT_GOVERNANCE_STATE_REJECTED"], materialChange: true };
  }

  const triggers: string[] = [];
  if (input.previous.modelId !== input.current.modelId || input.previous.modelVersion !== input.current.modelVersion) triggers.push("MODEL_CHANGED");
  if (input.previous.modelHash !== input.current.modelHash) triggers.push("MODEL_HASH_CHANGED", "WEIGHTS_CHANGED");
  if (input.previous.fineTuneReference !== input.current.fineTuneReference) triggers.push("FINE_TUNE_CHANGED");
  if (input.previous.hostingOperator !== input.current.hostingOperator) triggers.push("HOSTING_OPERATOR_CHANGED");
  if (input.previous.environmentAttestation?.environment !== input.current.environmentAttestation?.environment) triggers.push("ENVIRONMENT_CHANGED");
  if (input.previous.environmentAttestation?.runtimeReference !== input.current.environmentAttestation?.runtimeReference) triggers.push("RUNTIME_CHANGED");
  if (!sameStrings(input.previous.environmentAttestation?.toolSet ?? [], input.current.environmentAttestation?.toolSet ?? [])) triggers.push("TOOL_SET_CHANGED");
  if (!sameStrings(input.previous.permissionScope, input.current.permissionScope)) triggers.push("PERMISSION_SCOPE_CHANGED");
  if (!sameStrings(input.previous.safeguardsActive, input.current.safeguardsActive)) triggers.push("SAFEGUARD_CHANGED");
  if (!sameStrings(input.previous.applicableOversightRegimes, input.current.applicableOversightRegimes)) triggers.push("OVERSIGHT_REGIME_CHANGED");

  const previousThresholds = input.previous.capabilityAssessments.map((item) => `${item.assessmentType}:${item.capabilityThreshold}`);
  const currentThresholds = input.current.capabilityAssessments.map((item) => `${item.assessmentType}:${item.capabilityThreshold}`);
  if (!sameStrings(previousThresholds, currentThresholds)) triggers.push("CAPABILITY_THRESHOLD_CHANGED");
  if (input.current.capabilityAssessments.some((item) => item.validUntil !== null && time(item.validUntil) <= time(input.evaluatedAt))) triggers.push("CAPABILITY_ASSESSMENT_EXPIRED");

  const normalized = unique(triggers);
  if (!normalized.length) return { disposition: "UNCHANGED", triggers: [], materialChange: false };
  if (normalized.some((trigger) => input.policy.denyReauthorizationTriggers?.includes(trigger))) {
    return { disposition: "DENY", triggers: normalized, materialChange: true };
  }
  const reauthorizationTriggers = new Set([
    "MODEL_CHANGED", "WEIGHTS_CHANGED", "MODEL_HASH_CHANGED", "FINE_TUNE_CHANGED",
    "RUNTIME_CHANGED", "HOSTING_OPERATOR_CHANGED", "ENVIRONMENT_CHANGED", "TOOL_SET_CHANGED", "PERMISSION_SCOPE_CHANGED",
  ]);
  return {
    disposition: normalized.some((trigger) => reauthorizationTriggers.has(trigger)) ? "REAUTHORIZATION_REQUIRED" : "REVIEW_REQUIRED",
    triggers: normalized,
    materialChange: true,
  };
}

export function evaluateCapabilityGovernance(input: {
  entity: OperationalEntity;
  current: ModelGovernanceProjection;
  previous?: ModelGovernanceProjection | null;
  policy: CapabilityGovernancePolicy;
  evaluatedAt?: string;
}): CapabilityGovernanceEvaluation {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const reasons: string[] = [];
  const current = input.current;
  if (input.entity.enterpriseId !== current.enterpriseId || input.entity.entityId !== current.operationalEntityId) reasons.push("CROSS_TENANT_CAPABILITY_EVIDENCE_REJECTED");
  if (!current.modelId) reasons.push("MODEL_PROVENANCE_UNVERIFIED");
  if (!current.modelVersion) reasons.push("MODEL_VERSION_CHANGED");
  if (input.policy.requireModelHash && !current.modelHash) reasons.push("MODEL_PROVENANCE_UNVERIFIED");
  if (!current.deploymentOrigin || !current.hostingOperator) reasons.push("MODEL_PROVENANCE_UNVERIFIED");
  if (!validTime(evaluatedAt) || !validTime(current.evidenceTimestamp) || !validTime(current.evidenceExpiry)
    || time(current.evidenceTimestamp) > time(evaluatedAt)
    || (current.evidenceExpiry && time(current.evidenceExpiry) <= time(evaluatedAt))) reasons.push("CAPABILITY_ASSESSMENT_EXPIRED");

  const scopedAssessments = current.capabilityAssessments.filter((assessment) =>
    assessment.enterpriseId === current.enterpriseId
    && assessment.operationalEntityId === current.operationalEntityId,
  );
  if (scopedAssessments.length !== current.capabilityAssessments.length) reasons.push("CROSS_TENANT_CAPABILITY_EVIDENCE_REJECTED");
  const relevant = scopedAssessments.filter((assessment) => assessment.capabilityClass === input.policy.requiredCapabilityClass);
  if (!relevant.length) reasons.push("CAPABILITY_ASSESSMENT_MISSING");
  if (relevant.some((assessment) => !assessmentIsAttributed(assessment))) reasons.push("MODEL_PROVENANCE_UNVERIFIED");
  if (relevant.some((assessment) => !validTime(assessment.assessmentTimestamp)
    || !validTime(assessment.validFrom)
    || !validTime(assessment.validUntil)
    || time(assessment.validFrom) > time(evaluatedAt)
    || (assessment.validUntil && time(assessment.validUntil) <= time(evaluatedAt)))) reasons.push("CAPABILITY_ASSESSMENT_EXPIRED");
  if (relevant.some((assessment) => assessment.assessedModelId !== current.modelId || assessment.assessedModelVersion !== current.modelVersion)) reasons.push("MODEL_VERSION_CHANGED");
  if (relevant.some((assessment) => assessment.assessedModelHash !== null && assessment.assessedModelHash !== current.modelHash)) reasons.push("MODEL_HASH_CHANGED");
  if (assessmentsConflict(relevant)) reasons.push("CAPABILITY_EVIDENCE_CONFLICT");

  const environment = current.environmentAttestation;
  if (!environment && input.policy.requireEnvironmentAttestation) reasons.push("ENVIRONMENT_ATTESTATION_MISSING");
  if (environment) {
    if (environment.enterpriseId !== current.enterpriseId) reasons.push("CROSS_TENANT_CAPABILITY_EVIDENCE_REJECTED");
    if (!digestPattern.test(environment.evidenceDigest) || !validTime(environment.observedAt) || !validTime(environment.expiresAt)) reasons.push("ENVIRONMENT_ATTESTATION_MISSING");
    if (environment.hostingOperator !== current.hostingOperator) reasons.push("ENVIRONMENT_CHANGED");
    if (environment.expiresAt && time(environment.expiresAt) <= time(evaluatedAt)) reasons.push("ENVIRONMENT_CHANGED");
    if (relevant.some((assessment) => assessment.environmentReference !== environment.attestationReference)) reasons.push("ENVIRONMENT_CHANGED");
  }

  const missingSafeguards = input.policy.requiredSafeguards.filter((required) => !current.safeguardsActive.includes(required));
  if (missingSafeguards.length) reasons.push("SAFEGUARD_REQUIRED");
  if (!input.policy.allowedCapabilityClasses.includes(input.policy.requiredCapabilityClass)) reasons.push("ENTERPRISE_POLICY_REVIEW_REQUIRED");

  const reauthorization = evaluateCapabilityReauthorization({ previous: input.previous ?? null, current, policy: input.policy, evaluatedAt });
  reasons.push(...reauthorization.triggers);
  if (reauthorization.disposition === "REVIEW_REQUIRED" || reauthorization.disposition === "REAUTHORIZATION_REQUIRED") reasons.push("ENTERPRISE_POLICY_REVIEW_REQUIRED");

  const reasonCodes = unique(reasons);
  const hardDeny = reasonCodes.includes("CROSS_TENANT_CAPABILITY_EVIDENCE_REJECTED")
    || reauthorization.disposition === "DENY"
    || (input.policy.denyWhenSafeguardMissing && reasonCodes.includes("SAFEGUARD_REQUIRED"));
  const unknown = reasonCodes.some((reason) => ["MODEL_PROVENANCE_UNVERIFIED", "CAPABILITY_ASSESSMENT_MISSING", "ENVIRONMENT_ATTESTATION_MISSING"].includes(reason));
  const review = reasonCodes.some((reason) => reason !== "CAPABILITY_GOVERNANCE_PASS");
  const status: CapabilityGovernanceState = hardDeny ? "FAIL" : unknown ? "UNKNOWN" : review ? "REVIEW" : "PASS";
  const decision: CapabilityGovernanceDecision = hardDeny ? "DENY" : status === "PASS" ? "ALLOW" : "REVIEW";
  if (status === "PASS") reasonCodes.push("CAPABILITY_GOVERNANCE_PASS");

  const evidenceReferences = unique([
    ...scopedAssessments.map((assessment) => assessment.assessmentId),
    ...(environment?.enterpriseId === current.enterpriseId ? [environment.attestationReference] : []),
    ...(current.continuityReference ? [current.continuityReference] : []),
  ]);
  const snapshotWithoutDigest = {
    algorithmVersion: CAPABILITY_GOVERNANCE_VERSION,
    reauthorizationAlgorithmVersion: CAPABILITY_REAUTHORIZATION_VERSION,
    evaluatedAt,
    operationalEntityId: current.operationalEntityId,
    model: {
      modelId: current.modelId,
      modelVersion: current.modelVersion,
      modelHash: current.modelHash,
      fineTuneReference: current.fineTuneReference,
      modelFamily: current.modelFamily,
      deploymentOrigin: current.deploymentOrigin,
      hostingOperator: current.hostingOperator,
      openClosedClassification: current.openClosedClassification,
    },
    capabilityAssessmentReferences: relevant.map((assessment) => assessment.assessmentId).sort(),
    environmentAttestationReference: environment?.enterpriseId === current.enterpriseId ? environment.attestationReference : null,
    safeguardState: unique(current.safeguardsActive),
    oversightRegimes: unique(current.applicableOversightRegimes),
    authorityImpact: hardDeny ? "DENY" as const : reauthorization.disposition,
    reauthorizationTriggers: reauthorization.triggers,
    status,
    decision,
    reasonCodes,
    evidenceReferences,
  };
  const snapshot = Object.freeze({ ...snapshotWithoutDigest, digest: hashCanonical(snapshotWithoutDigest) }) as CapabilityGovernanceDecisionSnapshot;
  return { status, decision, reasonCodes, evidenceReferences, authorityImpact: snapshot.authorityImpact, reauthorization, snapshot };
}
