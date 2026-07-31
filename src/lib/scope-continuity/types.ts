import type { AuthorityGrant, AuthorityPrincipalType } from "../../../lib/core/authority-graph.ts";

export const environmentClasses = ["simulation", "development", "staging", "production", "unknown"] as const;
export const attestationSourceTypes = ["provider_assertion", "operator_assertion", "harness_configuration", "runtime_observation", "independent_attestation"] as const;
export const evidenceStrengths = ["asserted", "configured", "observed", "independently_attested", "cryptographically_attested"] as const;
export const scopeDecisionOutcomes = ["allow", "allow_with_reduced_trust", "require_human_approval", "pause", "deny", "revoke_scope"] as const;
export const contradictionTypes = [
  "declared_simulation_observed_production",
  "unexpected_internet_access",
  "unexpected_production_access",
  "unapproved_target_reachable",
  "isolation_configuration_drift",
  "provider_assertion_contradicted",
  "missing_required_attestation",
  "stale_attestation",
  "monitoring_unavailable",
  "agent_context_ambiguity_detected",
  "agent_continued_after_context_ambiguity",
  "independent_detection_absent",
] as const;

export type EnvironmentClass = (typeof environmentClasses)[number];
export type AttestationSourceType = (typeof attestationSourceTypes)[number];
export type EvidenceStrength = (typeof evidenceStrengths)[number];
export type ScopeDecisionOutcome = (typeof scopeDecisionOutcomes)[number];
export type ContradictionType = (typeof contradictionTypes)[number];
export type ContradictionSeverity = "informational" | "material" | "critical" | "emergency";
export type ScopeTrustState = "verified" | "degraded" | "contested" | "suspended" | "revoked";
export type EvidenceFreshness = "current" | "stale" | "expired" | "unknown";
export type IntegrityStatus = "unverified" | "verified" | "invalid" | "unknown";

export type ScopeIntegrityMetadata = {
  status: IntegrityStatus;
  algorithm?: string | null;
  digest?: string | null;
  signatureVerified?: boolean;
};

export type ExecutionContextDeclaration = {
  id: string;
  enterpriseId: string;
  subjectType: string;
  subjectId: string;
  workflowId?: string | null;
  executionId?: string | null;
  environmentClass: EnvironmentClass;
  internetAccessExpected: boolean;
  productionAccessExpected: boolean;
  permittedNetworkZones: string[];
  permittedDomains: string[];
  permittedTargetIdentifiers: string[];
  testHarnessProvider?: string | null;
  declarationSourceType: string;
  declarationSourceId: string;
  accountableOwnerType: string;
  accountableOwnerId: string;
  validFrom: string;
  validUntil: string;
  declaredAt: string;
  evidenceReference: string;
  integrityMetadata: ScopeIntegrityMetadata;
  createdAt: string;
};

export type EnvironmentAttestation = {
  id: string;
  enterpriseId: string;
  executionContextId: string;
  subjectType: string;
  subjectId: string;
  observationType: string;
  observedEnvironmentClass: EnvironmentClass;
  internetReachable: boolean | null;
  productionReachable: boolean | null;
  observedNetworkZones: string[];
  observedDomains: string[];
  observedTargetIdentifiers: string[];
  egressPolicyState: "enforced" | "degraded" | "not_enforced" | "unknown";
  isolationControlState: "confirmed" | "degraded" | "absent" | "unknown";
  monitoringState: "available" | "degraded" | "unavailable" | "unknown";
  attestationSourceType: AttestationSourceType;
  attestationSourceId: string;
  providerOrThirdPartyIdentity?: string | null;
  sourceAuthority: string;
  observedAt: string;
  receivedAt: string;
  confidence: number;
  freshness: EvidenceFreshness;
  evidenceStrength: EvidenceStrength;
  evidenceReference: string;
  integrityMetadata: ScopeIntegrityMetadata;
  supersedesAttestationId?: string | null;
  createdAt: string;
};

export type ScopeAuthorizationLease = {
  id: string;
  enterpriseId: string;
  subjectType: AuthorityPrincipalType;
  subjectId: string;
  authorizedObjective: string;
  permittedTools: string[];
  permittedActions: string[];
  permittedTargets: string[];
  permittedEnvironments: EnvironmentClass[];
  maximumDurationSeconds: number;
  maximumActionCount: number;
  consumedActionCount: number;
  dataClassificationBoundary: string[];
  approverType: AuthorityPrincipalType;
  approverId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  requiredAttestationTypes: AttestationSourceType[];
  contradictionResponsePolicy: "require_human_approval" | "pause" | "deny" | "revoke_scope";
  authorityReference?: string | null;
  evidenceReferences: string[];
};

export type ScopeActionRequest = {
  action: string;
  objective: string;
  tool?: string | null;
  targetIdentifier: string;
  targetEnvironmentClass: EnvironmentClass;
  dataClassification?: string | null;
  requestedAt: string;
};

export type ScopeContinuityPolicy = {
  policyId: string;
  policyVersion: string;
  maximumAttestationAgeSeconds: number;
  requireIndependentAttestation: boolean;
  missingAttestationOutcome: "require_human_approval" | "deny";
  staleAttestationOutcome: "pause" | "require_human_approval";
  unexpectedInternetOutcome: "pause" | "deny";
  monitoringUnavailableOutcome: "allow_with_reduced_trust" | "require_human_approval" | "pause";
  contradictionAfterAllowOutcome: "pause" | "revoke_scope";
  criticalContradictionOutcome: "deny" | "revoke_scope";
};

export type ContextContradictionEvent = {
  id: string;
  enterpriseId: string;
  executionContextId: string;
  decisionId: string;
  type: ContradictionType;
  severity: ContradictionSeverity;
  reasonCode: string;
  evidenceReferences: string[];
  detectedBy: string;
  detectedAt: string;
};

export type ScopeContinuityDecision = {
  id: string;
  enterpriseId: string;
  executionContextId: string;
  declarationReference: string;
  attestationReferences: string[];
  authorizationReference: string;
  requestedAction: ScopeActionRequest;
  evidenceAvailability: "sufficient" | "degraded" | "insufficient";
  contradictions: ContextContradictionEvent[];
  outcome: ScopeDecisionOutcome;
  humanReviewRequired: boolean;
  reasonCodes: string[];
  missingEvidence: string[];
  evidenceReferences: string[];
  trustImpact: { priorState: ScopeTrustState | null; nextState: ScopeTrustState; reasonCodes: string[] };
  decisionTimestamp: string;
  decisionVersion: string;
  policyId: string;
  policyVersion: string;
  correlationId: string;
  decisionHash: string;
};

export type ScopeContinuityEvaluationInput = {
  declaration: ExecutionContextDeclaration;
  attestations: EnvironmentAttestation[];
  authorization: ScopeAuthorizationLease;
  request: ScopeActionRequest;
  policy: ScopeContinuityPolicy;
  evaluatedAt: string;
  correlationId: string;
  previousDecision?: Pick<ScopeContinuityDecision, "id" | "outcome" | "trustImpact"> | null;
};

export type EnvironmentAuthorityRelationship = {
  type: "DECLARED_BY" | "CONFIGURED_BY" | "CONTROLLED_BY" | "AUTHORIZED_BY" | "MONITORED_BY" | "OBSERVED_BY" | "ATTESTED_BY" | "REQUESTS_ACCESS_TO" | "CONTRADICTS" | "SATISFIES" | "REQUIRES" | "REVOKES" | "DETECTED_BY" | "CONTAINED_BY" | "REVIEWED_BY";
  from: string;
  to: string;
  evidenceReference?: string | null;
  occurredAt: string;
};

export type ScopeReplayLabel = "ASSERTED" | "CONFIGURED" | "OBSERVED" | "INDEPENDENTLY_ATTESTED" | "INFERRED" | "DECIDED";
export type ScopeReplayItem = {
  id: string;
  enterpriseId: string;
  executionContextId: string;
  stage: "declared_environment" | "configuration_assertion" | "runtime_observation" | "independent_attestation" | "authorized_scope" | "requested_action" | "requested_target" | "contradiction" | "scope_decision" | "external_action" | "detection" | "containment" | "trust_change" | "human_review";
  label: ScopeReplayLabel;
  sourceType: string;
  sourceIdentity: string;
  occurredAt: string;
  evidenceStrength: EvidenceStrength;
  integrityStatus: IntegrityStatus;
  correlationId: string;
  evidenceReference?: string | null;
  summary: string;
  evidenced: boolean;
};

export type ScopeContinuityArtifacts = {
  authorityLineage: EnvironmentAuthorityRelationship[];
  replay: ScopeReplayItem[];
  evidenceGraph: { nodes: Array<{ id: string; type: string; label: string; metadata: Record<string, unknown> }>; relationships: Array<{ from: string; to: string; type: string; evidenceReference?: string | null }> };
  trustMemory: { eventKind: string; trustStateBefore: string; trustStateAfter: string; evidenceReferences: string[]; authorityReferences: string[]; reason: string };
  canonicalTrustState: "VERIFIED" | "CHALLENGED" | "BLOCKED" | "REVOKED";
};

export type ScopeAuthorizationEvaluation = {
  grant: AuthorityGrant;
  allowed: boolean;
  reasonCodes: string[];
};

export const defaultScopeContinuityPolicy: ScopeContinuityPolicy = {
  policyId: "scope-continuity-default",
  policyVersion: "1.0.0",
  maximumAttestationAgeSeconds: 900,
  requireIndependentAttestation: true,
  missingAttestationOutcome: "require_human_approval",
  staleAttestationOutcome: "pause",
  unexpectedInternetOutcome: "deny",
  monitoringUnavailableOutcome: "require_human_approval",
  contradictionAfterAllowOutcome: "revoke_scope",
  criticalContradictionOutcome: "deny",
};
