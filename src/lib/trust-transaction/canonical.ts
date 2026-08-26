import { createDecisionEnvelope } from "../trust-fabric/control-plane.ts";
import { evaluateTrustContract } from "../trust-fabric/contracts.ts";
import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import {
  classifyOperationalConsequence,
  createOperationalEntity,
  type OperationalConsequenceClassification,
  type OperationalEntity,
  type OperationalEntityResolutionInput,
} from "../../../lib/operational-entities/operational-entity.ts";
import {
  classifyEvidenceIndependence,
  createDecisionTimeSnapshot,
  type DecisionTimeSnapshot,
  type EnforcementChain,
  type ManagedControlEvidence,
  type ResponsibilityLineage,
} from "../../../lib/operational-entities/federated-evidence.ts";
import type {
  EnterpriseSubjectClass,
  EnterpriseTrustObject,
  FabricReference,
  TrustContract,
  TrustFabricDecisionEnvelope,
} from "../trust-fabric/types.ts";
import { deriveTrustConfidence, type TrustConclusionConfidence } from "../../../lib/trust-intelligence.ts";
import { normalizeProviderNeutralEvidence, type ProviderNeutralEvidence } from "../../../lib/providers/adapters.ts";
import {
  evaluateAuthorityIntegrity,
  type AuthorityIntegrityAssessment,
  type AuthorityIntegrityEvaluationInput,
} from "../../../lib/trust-fabric/authority-integrity.ts";
import {
  createPreActionTrustForecastInput,
  type TrustForecast,
  type TrustForecastEvaluationInput,
  type ForecastSubjectType,
} from "../../../lib/trust-fabric/trust-forecast.ts";
import { createTrustTwin, type TrustTwin } from "../../../lib/trust-fabric/trust-twin.ts";
import type { AdaptiveVerificationRequirement } from "../../../lib/trust-fabric/adaptive-verification.ts";
import { createSentinelTrustBrief, type SentinelTrustBrief } from "../../../lib/trust-fabric/sentinel-agents.ts";
import {
  evaluateModelStateIntegrity,
  type ApprovedModelStateSnapshot,
  type CurrentObservedModelState,
  type ModelStateChangeProvenance,
  type ModelStateIntegrityAssessment,
  type ModelStateRetrospectiveAdvisory,
} from "../../../lib/trust-fabric/model-state-integrity.ts";

export type CanonicalTransactionDecision = "ALLOW" | "REVIEW" | "DENY";
export type CanonicalOperationalState = "verified" | "degraded" | "suspended";
export type ExternalOutcomeState = "SUCCEEDED" | "FAILED" | "UNKNOWN";

export type DeploymentAssuranceEvidence = {
  providerKey: string;
  assessmentId: string;
  subject: string;
  environment: string;
  scope: string;
  methodReference: string;
  occurredAt: string;
  receivedAt: string;
  expiresAt: string;
  modelVersion: string | null;
  toolSet: string[];
  permissionContext: string | null;
  assurance: number | null;
  confidence: string;
  evidenceDigest: string;
  findingReferences: string[];
  retestReference: string | null;
};

export type DeploymentGateContext = {
  environment?: string;
  release?: string;
  materialChanges?: string[];
  assuranceEvidence?: DeploymentAssuranceEvidence[];
  environmentAttestation?: Record<string, unknown> | null;
  providerNeutralFindings?: Record<string, unknown>[] | null;
  approvedModelState?: ApprovedModelStateSnapshot | null;
  currentObservedModelState?: CurrentObservedModelState | null;
  modelStateChangeProvenance?: Partial<ModelStateChangeProvenance> | null;
  modelValidation?: { validationReference: string; validatedBaselineDigest: string; reassessmentReference?: string | null } | null;
  retrospectiveModelStateAdvisory?: ModelStateRetrospectiveAdvisory | null;
};

export type DeploymentGateSummary = {
  decisionType: string;
  materialChanges: string[];
  assuranceFreshness: "ASSURANCE_CURRENT" | "ASSURANCE_STALE" | "ASSURANCE_EXPIRED" | "ASSURANCE_INVALIDATED_BY_CHANGE" | "ASSURANCE_UNPROVEN";
  assuranceEvidenceCount: number;
  currentAssuranceCount: number;
  staleEvidenceCount: number;
  reauthorizationRequired: boolean;
  pendingRevalidation: string[];
  forecastReference: string | null;
  forecastState: TrustForecast["state"] | null;
  deploymentRecommendation: TrustForecast["deploymentRecommendation"] | null;
  requiredControls: TrustForecast["requiredControls"];
  evidenceGaps: string[];
  modelIntegrityState: ModelStateIntegrityAssessment["modelIntegrityState"] | null;
  validationState: ModelStateIntegrityAssessment["validationLineage"]["status"] | null;
};

export type CanonicalContextEvidence = {
  providerClass: string;
  providerKey: string;
  evidenceType: string;
  observedAt: string;
  outcome: string;
  evidenceDigest: string;
  metadata?: Record<string, unknown>;
};

export type ExecutionContinuityStage =
  | "INTENDED_ACTION"
  | "REQUESTED_ACTION"
  | "AUTHORIZED_ACTION"
  | "COMMAND_SENT"
  | "COMMAND_ACKNOWLEDGED"
  | "ACTION_EXECUTED"
  | "WORLD_STATE_CHANGED"
  | "CONSEQUENCE_OBSERVED";

export type ExecutionContinuityRecord = {
  stage: ExecutionContinuityStage;
  status: "observed" | "asserted" | "missing" | "not_applicable";
  occurredAt: string | null;
  evidenceReference: string | null;
};

export type CanonicalTrustTransactionInput = {
  trustObject: { subjectType: EnterpriseSubjectClass; subjectId: string };
  action: {
    type: string;
    purpose: string;
    resource: string;
    environment: string;
    payloadDigest: string;
  };
  idempotencyKey: string;
  decisionType?: string | null;
  deploymentContext?: DeploymentGateContext | null;
  providerExecutionId?: string | null;
  previousTransactionId?: string | null;
  operationalEntityId?: string | null;
  requestedAt?: string;
  managedControl?: {
    responsibilityLineage?: Partial<ResponsibilityLineage>;
    providerHealth?: Record<string, string>;
    configurationRulesetDigest?: string;
    enforcementState?: Partial<EnforcementChain>;
    contradictions?: string[];
    reviewerState?: string;
    authorization?: { decision: CanonicalTransactionDecision; reasonCodes: string[] };
    humanIntent?: { signed?: boolean; status?: "provided" | "not_provided" | "pending"; reference?: string | null };
    monitoringCoverage?: "covered" | "partial" | "not_observed";
    oversightMode?: "HUMAN_IN_THE_LOOP" | "HUMAN_ON_THE_LOOP" | "HUMAN_OVER_THE_LOOP" | "AUTONOMOUS";
    executionStages?: ExecutionContinuityRecord[];
    contextEvidence?: CanonicalContextEvidence[];
    authorityIntegrity?: AuthorityIntegrityEvaluationInput | null;
    trustForecast?: TrustForecastEvaluationInput | null;
  };
};

export type AuthenticatedTransactionActor = { id: string; type: "human" | "ai_agent"; authority: string };
export type SessionTenant = { id: string; name: string };
export type StoredProviderEvidence = {
  reference: string;
  type: string;
  providerId: string;
  providerEventId: string;
  providerSessionId: string;
  outcome: "PASSED" | "FAILED" | "INCONCLUSIVE" | "NOT_PERFORMED" | "UNKNOWN";
  observedAt: string;
  expiresAt: string | null;
  sourceDigest: string;
  assuranceLevel: number | null;
  correlationId: string;
  sourcePartyId?: string;
  sourceClassification?: ManagedControlEvidence["sourceClassification"];
  schemaVersion?: string;
};
export type ResolvedPolicyVersion = {
  id: string;
  version: string;
  active: boolean;
  validFrom: string;
  validUntil: string | null;
  policyHash: string;
};
export type PreviousCanonicalTransaction = {
  transactionId: string;
  enterpriseId: string;
  trustState: CanonicalOperationalState;
  decision: CanonicalTransactionDecision;
  evidenceDigest: string;
  authorityReference: string;
  policyVersion: string;
  trustTwin?: TrustTwin | null;
};
export type CanonicalContinuitySignals = {
  identityContinuity: "continuous" | "review_required" | "interrupted";
  monitoringCoverage: "covered" | "partial" | "not_observed";
  signedHumanIntent: "provided" | "not_provided" | "pending";
  consequentialImpactLineage: {
    target: string;
    consequence: OperationalConsequenceClassification;
    evidenceProvider: string;
    humanReviewRequired: boolean;
  };
};

export type CanonicalDecisionRecord = {
  transactionId: string;
  enterpriseId: string;
  actorId: string;
  actorType: AuthenticatedTransactionActor["type"];
  operationalEntityId: string;
  accountableOwnerId: string;
  entityType: string;
  entityLifecycleState: string;
  trustObject: CanonicalTrustTransactionInput["trustObject"];
  workflowId: string;
  action: CanonicalTrustTransactionInput["action"];
  idempotencyKey: string;
  correlationId: string;
  requestedAt: string;
  decision: CanonicalTransactionDecision;
  trustState: CanonicalOperationalState;
  reasonCodes: string[];
  decisionEnvelope: TrustFabricDecisionEnvelope;
  decisionReference: string;
  authorityReference: string;
  authorityEvidenceReferences: FabricReference[];
  policy: ResolvedPolicyVersion;
  evidence: StoredProviderEvidence[];
  evidenceDigest: string;
  evidenceComplete: boolean;
  evidenceFresh: boolean;
  evidenceReferences: FabricReference[];
  consequence: OperationalConsequenceClassification;
  confidenceInConclusion: TrustConclusionConfidence;
  timestamp: string;
  digest: string;
  previousTransactionId: string | null;
  changedConditions: string[];
  materialChange: boolean;
  responsibilityLineage: ResponsibilityLineage;
  evidenceIndependence: ReturnType<typeof classifyEvidenceIndependence>;
  decisionTimeSnapshot: DecisionTimeSnapshot;
  continuitySignals: CanonicalContinuitySignals;
  providerNeutralEvidence: ProviderNeutralEvidence[];
  deploymentGate: DeploymentGateSummary | null;
  executionContinuity: ExecutionContinuityRecord[];
  authorityIntegrity: AuthorityIntegrityAssessment | null;
  trustForecast: TrustForecast | null;
  trustTwin: TrustTwin | null;
  adaptiveVerification: AdaptiveVerificationRequirement | null;
  sentinelTrustBrief: SentinelTrustBrief | null;
  modelStateIntegrity: ModelStateIntegrityAssessment | null;
};
export type PersistedCanonicalDecision = CanonicalDecisionRecord & {
  persistenceStatus: "CREATED" | "DUPLICATE";
};
export type ExternalExecutionResult = {
  configured: boolean;
  requestReference: string | null;
  acknowledgement?: { externalReference: string; acknowledgedAt: string } | null;
  outcome?: { state: ExternalOutcomeState; externalReference: string | null; occurredAt: string; reason: string } | null;
};
export type SafeCanonicalTransactionReceipt = {
  transactionId: string;
  correlationId: string;
  enterpriseId: string;
  operationalEntityId: string;
  accountableOwnerId: string;
  entityType: string;
  entityLifecycleState: string;
  actor: { id: string; type: string };
  trustObject: CanonicalTrustTransactionInput["trustObject"];
  action: Omit<CanonicalTrustTransactionInput["action"], "payloadDigest"> & { requestDigest: string };
  decision: CanonicalTransactionDecision;
  trustState: CanonicalOperationalState;
  reasonCodes: string[];
  evidence: Array<{ reference: string; type: string; providerId: string; providerEventId: string; sourceDigest: string; outcome: string; observedAt: string; expiresAt: string | null }>;
  evidenceComplete: boolean;
  evidenceFresh: boolean;
  evidenceReferences: FabricReference[];
  authorityReference: string;
  authorityLineageReferences: FabricReference[];
  policy: { id: string; version: string; hash: string };
  decisionReference: string;
  evidenceGraphReference: string;
  replayReference: string;
  trustMemoryReference: string | null;
  materialChange: boolean;
  changedConditions: string[];
  responsibilityLineage: ResponsibilityLineage;
  evidenceIndependence: ReturnType<typeof classifyEvidenceIndependence>;
  decisionTimeSnapshot: DecisionTimeSnapshot;
  continuitySignals: CanonicalContinuitySignals;
  providerNeutralEvidence: ProviderNeutralEvidence[];
  deploymentGate: DeploymentGateSummary | null;
  executionContinuity: ExecutionContinuityRecord[];
  authorityIntegrity: AuthorityIntegrityAssessment | null;
  trustForecast: TrustForecast | null;
  trustTwin: TrustTwin | null;
  adaptiveVerification: AdaptiveVerificationRequirement | null;
  sentinelTrustBrief: SentinelTrustBrief | null;
  modelStateIntegrity: ModelStateIntegrityAssessment | null;
  consequence: OperationalConsequenceClassification;
  confidenceInConclusion: TrustConclusionConfidence;
  timestamp: string;
  digest: string;
  externalExecution: {
    requested: boolean;
    requestReference: string | null;
    acknowledgementReference: string | null;
    outcomeReference: string | null;
    outcome: ExternalOutcomeState | "NOT_REQUESTED" | "NOT_CONFIGURED";
  };
  historyUrl: string;
  idempotentReplay: boolean;
};

export type CanonicalTrustTransactionDependencies = {
  authenticateActor(): Promise<AuthenticatedTransactionActor>;
  resolveTenantFromSession(actor: AuthenticatedTransactionActor): Promise<SessionTenant>;
  findByIdempotency(enterpriseId: string, idempotencyKey: string): Promise<SafeCanonicalTransactionReceipt | null>;
  loadTrustObject(enterpriseId: string, subjectType: EnterpriseSubjectClass, subjectId: string): Promise<EnterpriseTrustObject>;
  loadConfiguredEvidence(input: { enterpriseId: string; subjectId: string; operationalEntityId?: string | null; providerExecutionId?: string | null }): Promise<StoredProviderEvidence[]>;
  loadAuthority(enterpriseId: string, subjectType: EnterpriseSubjectClass, subjectId: string): Promise<TrustContract>;
  loadPolicy(enterpriseId: string, policyId: string, policyVersion: string): Promise<ResolvedPolicyVersion>;
  loadPreviousTransaction(enterpriseId: string, transactionId?: string | null): Promise<PreviousCanonicalTransaction | null>;
  resolveOperationalEntity?(tenantId: string, input: OperationalEntityResolutionInput): Promise<OperationalEntity>;
  persistDecision(record: CanonicalDecisionRecord): Promise<PersistedCanonicalDecision>;
  extendEvidenceGraph(record: PersistedCanonicalDecision): Promise<string>;
  appendReplay(record: PersistedCanonicalDecision): Promise<string>;
  emitTrustMemory(record: PersistedCanonicalDecision): Promise<string>;
  requestExternalExecution(record: PersistedCanonicalDecision): Promise<ExternalExecutionResult>;
  recordExternalAcknowledgement(record: PersistedCanonicalDecision, result: NonNullable<ExternalExecutionResult["acknowledgement"]>): Promise<string>;
  recordExternalOutcome(record: PersistedCanonicalDecision, result: NonNullable<ExternalExecutionResult["outcome"]>): Promise<string>;
};

type TransactionContext = {
  input: CanonicalTrustTransactionInput;
  actor: AuthenticatedTransactionActor;
  tenant: SessionTenant;
  operationalEntity: OperationalEntity;
  trustObject: EnterpriseTrustObject;
  authority: TrustContract;
  policy: ResolvedPolicyVersion;
  evidence: StoredProviderEvidence[];
  evidenceFresh: boolean;
  authorityScopeValid: boolean;
  previous: PreviousCanonicalTransaction | null;
  record: CanonicalDecisionRecord;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digestPattern = /^[a-f0-9]{64}$/;
const referencePattern = /^[a-zA-Z0-9_.:/-]{1,180}$/;

function assertInput(input: CanonicalTrustTransactionInput) {
  if (!referencePattern.test(input.trustObject.subjectId) || !referencePattern.test(input.action.type) || !referencePattern.test(input.action.purpose)) throw new TypeError("Trust Object, action and purpose references are required.");
  if (!input.action.resource.trim() || input.action.resource.length > 300 || !referencePattern.test(input.action.environment)) throw new TypeError("A bounded action resource and environment are required.");
  if (!digestPattern.test(input.action.payloadDigest)) throw new TypeError("The action payload must be represented by a SHA-256 digest.");
  if (!/^[a-zA-Z0-9_.:-]{8,180}$/.test(input.idempotencyKey)) throw new TypeError("A valid idempotency key is required.");
  if (input.providerExecutionId && !uuidPattern.test(input.providerExecutionId)) throw new TypeError("Provider execution reference is invalid.");
  if (input.previousTransactionId && !uuidPattern.test(input.previousTransactionId)) throw new TypeError("Previous transaction reference is invalid.");
}

function isSameIdempotentRequest(receipt: SafeCanonicalTransactionReceipt, input: CanonicalTrustTransactionInput, actor: AuthenticatedTransactionActor) {
  return receipt.actor.id === actor.id
    && receipt.trustObject.subjectType === input.trustObject.subjectType
    && receipt.trustObject.subjectId === input.trustObject.subjectId
    && receipt.action.type === input.action.type
    && receipt.action.purpose === input.action.purpose
    && receipt.action.resource === input.action.resource
    && receipt.action.environment === input.action.environment
    && receipt.action.requestDigest === input.action.payloadDigest;
}

export async function authenticateActor(dependencies: CanonicalTrustTransactionDependencies) {
  const actor = await dependencies.authenticateActor();
  if (!actor.id || !actor.authority) throw new Error("AUTHENTICATION_REQUIRED");
  return actor;
}

export async function resolveTenantFromSession(dependencies: CanonicalTrustTransactionDependencies, actor: AuthenticatedTransactionActor) {
  const tenant = await dependencies.resolveTenantFromSession(actor);
  if (!uuidPattern.test(tenant.id)) throw new Error("SESSION_TENANT_UNAVAILABLE");
  return tenant;
}

export async function resolveTrustObject(dependencies: CanonicalTrustTransactionDependencies, tenant: SessionTenant, input: CanonicalTrustTransactionInput) {
  const object = await dependencies.loadTrustObject(tenant.id, input.trustObject.subjectType, input.trustObject.subjectId);
  if (object.enterpriseId !== tenant.id || object.subjectId !== input.trustObject.subjectId || object.subjectType !== input.trustObject.subjectType) throw new Error("TRUST_OBJECT_TENANT_MISMATCH");
  return object;
}

export async function collectConfiguredEvidence(dependencies: CanonicalTrustTransactionDependencies, tenant: SessionTenant, trustObject: EnterpriseTrustObject, input: CanonicalTrustTransactionInput) {
  const evidence = await dependencies.loadConfiguredEvidence({ enterpriseId: tenant.id, subjectId: trustObject.subjectId, operationalEntityId: input.operationalEntityId, providerExecutionId: input.providerExecutionId });
  return evidence.filter((item) => digestPattern.test(item.sourceDigest) && Boolean(item.providerEventId) && uuidPattern.test(item.correlationId));
}

export function validateEvidenceFreshness(evidence: StoredProviderEvidence[], maximumAgeSeconds: number, at: string) {
  const evaluatedAt = Date.parse(at);
  return evidence.length > 0 && evidence.every((item) => {
    const observedAt = Date.parse(item.observedAt);
    const expiresAt = item.expiresAt ? Date.parse(item.expiresAt) : Number.POSITIVE_INFINITY;
    return item.outcome === "PASSED" && Number.isFinite(observedAt) && evaluatedAt >= observedAt && evaluatedAt - observedAt <= maximumAgeSeconds * 1000 && expiresAt > evaluatedAt;
  });
}

export async function resolveAuthority(dependencies: CanonicalTrustTransactionDependencies, tenant: SessionTenant, trustObject: EnterpriseTrustObject) {
  const authority = await dependencies.loadAuthority(tenant.id, trustObject.subjectType, trustObject.subjectId);
  if (authority.enterpriseId !== tenant.id || authority.subjectId !== trustObject.subjectId || authority.subjectType !== trustObject.subjectType) throw new Error("AUTHORITY_TENANT_MISMATCH");
  return authority;
}

export function validateAuthorityScope(authority: TrustContract, input: CanonicalTrustTransactionInput, at: string) {
  return authority.revocationState === "active"
    && Date.parse(authority.issuedAt) <= Date.parse(at)
    && Date.parse(authority.expiresAt) > Date.parse(at)
    && authority.permittedScope.includes(input.action.type)
    && authority.authorizedObjective === input.action.purpose;
}

function deriveDeploymentGate(input: {
  decisionType: string | null | undefined;
  deploymentContext: DeploymentGateContext | null | undefined;
  requestedAt: string;
  evidenceFresh: boolean;
  trustForecast: TrustForecast | null;
  modelStateIntegrity: ModelStateIntegrityAssessment | null;
}): DeploymentGateSummary | null {
  if (input.decisionType !== "AI_DEPLOYMENT_TRUST_GATE") return null;
  const materialChanges = Array.isArray(input.deploymentContext?.materialChanges)
    ? [...new Set(input.deploymentContext!.materialChanges.filter((value): value is string => typeof value === "string"))]
    : [];
  const assuranceEvidence = Array.isArray(input.deploymentContext?.assuranceEvidence)
    ? input.deploymentContext!.assuranceEvidence.filter((value): value is DeploymentAssuranceEvidence => Boolean(value))
    : [];
  const evaluatedAt = Date.parse(input.requestedAt);
  const activeEvidence = assuranceEvidence.filter((item) => {
    const expiresAt = Date.parse(item.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > evaluatedAt;
  });
  const staleEvidence = assuranceEvidence.filter((item) => {
    const expiresAt = Date.parse(item.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= evaluatedAt;
  });
  let assuranceFreshness: DeploymentGateSummary["assuranceFreshness"] = "ASSURANCE_UNPROVEN";
  if (!assuranceEvidence.length) {
    assuranceFreshness = "ASSURANCE_UNPROVEN";
  } else if (staleEvidence.length) {
    assuranceFreshness = "ASSURANCE_EXPIRED";
  } else if (materialChanges.length > 0 && !activeEvidence.some((item) => Boolean(item.retestReference))) {
    assuranceFreshness = "ASSURANCE_INVALIDATED_BY_CHANGE";
  } else if (!input.evidenceFresh) {
    assuranceFreshness = "ASSURANCE_STALE";
  } else {
    assuranceFreshness = "ASSURANCE_CURRENT";
  }
  const forecastChanges = input.trustForecast?.materialChanges ?? [];
  const modelStateRequiresQualification = Boolean(input.modelStateIntegrity && !["EXACT_MATCH", "SUPPORTED_MATCH"].includes(input.modelStateIntegrity.modelIntegrityState));
  if (modelStateRequiresQualification) assuranceFreshness = "ASSURANCE_INVALIDATED_BY_CHANGE";
  const reauthorizationRequired = (materialChanges.length > 0 && assuranceFreshness !== "ASSURANCE_CURRENT")
    || modelStateRequiresQualification
    || input.trustForecast?.reauthorizationRequired === true;
  return {
    decisionType: "AI_DEPLOYMENT_TRUST_GATE",
    materialChanges,
    assuranceFreshness,
    assuranceEvidenceCount: assuranceEvidence.length,
    currentAssuranceCount: activeEvidence.length,
    staleEvidenceCount: staleEvidence.length,
    reauthorizationRequired,
    pendingRevalidation: reauthorizationRequired ? [...new Set([...materialChanges, ...forecastChanges, ...(input.modelStateIntegrity?.validationLineage.findings ?? []), ...(materialChanges.length || forecastChanges.length || modelStateRequiresQualification ? [] : ["assurance-evidence"])])] : [],
    forecastReference: input.trustForecast?.forecastId ?? null,
    forecastState: input.trustForecast?.state ?? null,
    deploymentRecommendation: input.trustForecast?.deploymentRecommendation ?? null,
    requiredControls: input.trustForecast?.requiredControls ?? [],
    evidenceGaps: input.trustForecast?.evidenceGaps ?? [],
    modelIntegrityState: input.modelStateIntegrity?.modelIntegrityState ?? null,
    validationState: input.modelStateIntegrity?.validationLineage.status ?? null,
  };
}

export async function resolvePolicyVersion(dependencies: CanonicalTrustTransactionDependencies, tenant: SessionTenant, authority: TrustContract, at: string) {
  const policy = await dependencies.loadPolicy(tenant.id, authority.policyId, authority.policyVersion);
  const time = Date.parse(at);
  // Bound sub-second storage/client clock skew without allowing a future policy
  // version to become materially active before its declared start.
  if (!policy.active || Date.parse(policy.validFrom) > time + 1_000 || (policy.validUntil && Date.parse(policy.validUntil) <= time)) throw new Error("POLICY_VERSION_INACTIVE");
  return policy;
}

function conditionChanges(previous: PreviousCanonicalTransaction | null, evidenceDigest: string, authorityReference: string, policyVersion: string) {
  if (!previous) return ["INITIAL_TRUST_DECISION"];
  return [
    previous.evidenceDigest !== evidenceDigest ? "EVIDENCE_CHANGED" : null,
    previous.authorityReference !== authorityReference ? "AUTHORITY_CHANGED" : null,
    previous.policyVersion !== policyVersion ? "POLICY_CHANGED" : null,
  ].filter((value): value is string => Boolean(value));
}

function deriveContinuitySignals(input: {
  decision: CanonicalTransactionDecision;
  consequence: OperationalConsequenceClassification;
  authority: TrustContract;
  evidenceFresh: boolean;
  trustObject: EnterpriseTrustObject;
  responsibilityLineage: ResponsibilityLineage;
  transactionInput: CanonicalTrustTransactionInput;
  providerNeutralEvidence: ProviderNeutralEvidence[];
}): CanonicalContinuitySignals {
  const providerNeutralEvidence = input.providerNeutralEvidence;
  const observedProviderEvidence = providerNeutralEvidence.filter((item) => !item.evidenceType.startsWith("TRUST_CONDITION_"));
  const monitoringCoverage = input.transactionInput.managedControl?.monitoringCoverage
    ?? (observedProviderEvidence.length > 0 && (input.authority.monitoringRequirements.length > 0 || observedProviderEvidence.some((item) => /runtime|monitor/i.test(item.evidenceType)))
      ? "covered"
      : observedProviderEvidence.length > 0
        ? "partial"
        : "not_observed");
  const reviewRequired = input.decision === "REVIEW" || input.transactionInput.managedControl?.humanIntent?.status === "pending";
  const identityContinuity = reviewRequired
    ? "review_required"
    : input.evidenceFresh && input.trustObject.activeContradictions.length === 0
      ? "continuous"
      : input.evidenceFresh
        ? "review_required"
        : "interrupted";
  const signedHumanIntent = input.transactionInput.managedControl?.humanIntent?.status ?? (input.transactionInput.managedControl?.humanIntent?.signed ? "provided" : "not_provided");
  return {
    identityContinuity,
    monitoringCoverage,
    signedHumanIntent,
    consequentialImpactLineage: {
      target: input.transactionInput.action.resource,
      consequence: input.consequence,
      evidenceProvider: input.responsibilityLineage.evidenceProvider,
      humanReviewRequired: input.decision === "REVIEW",
    },
  };
}

export function evaluateCanonicalTrustDecision(input: {
  tenant: SessionTenant;
  actor: AuthenticatedTransactionActor;
  operationalEntity: OperationalEntity;
  trustObject: EnterpriseTrustObject;
  authority: TrustContract;
  policy: ResolvedPolicyVersion;
  evidence: StoredProviderEvidence[];
  evidenceFresh: boolean;
  authorityScopeValid: boolean;
  previous: PreviousCanonicalTransaction | null;
  transactionInput: CanonicalTrustTransactionInput;
  requestedAt: string;
  correlationId: string;
}): CanonicalDecisionRecord {
  const evidenceReferences = input.evidence.map((item) => ({ type: "normalized_provider_evidence", id: item.reference }));
  const evidenceTypes = new Set(input.evidence.map((item) => item.type));
  const evidenceComplete = input.authority.requiredEvidenceTypes.every((type) => evidenceTypes.has(type));
  const evidenceDigest = hashCanonical(input.evidence.map((item) => ({ reference: item.reference, event: item.providerEventId, digest: item.sourceDigest, outcome: item.outcome, observedAt: item.observedAt, expiresAt: item.expiresAt })));
  const authorityEvidenceReferences = input.authority.evidenceReferences;
  const evaluation = evaluateTrustContract({
    contract: input.authority,
    evaluatedAt: input.requestedAt,
    identityState: input.evidenceFresh ? "verified" : "degraded",
    authorityState: input.authorityScopeValid ? "verified" : "suspended",
    effectiveAuthority: input.authorityScopeValid ? input.authority.requiredAuthority : [],
    environmentState: input.trustObject.environmentState,
    scopeState: input.authorityScopeValid ? "verified" : "suspended",
    requestedScope: [input.transactionInput.action.type],
    activeProviders: input.evidence.map((item) => item.providerId),
    evidence: input.evidence.map((item) => ({ type: item.type, observedAt: item.observedAt, reference: { type: "normalized_provider_evidence", id: item.reference } })),
    monitoring: input.authority.monitoringRequirements,
    contradictions: input.trustObject.activeContradictions.map((item) => item.id),
    highestIncidentSeverity: input.trustObject.activeIncidents.length ? "material" : "none",
    humanReviewRequired: input.trustObject.activeReviews.some((item) => item.reviewRequired),
    correlationId: input.correlationId,
  });
  const missingAccountability = !input.operationalEntity.accountableOwnerId || input.operationalEntity.accountableOwnerId === "legacy_unresolved";
  const entityStateReason = input.operationalEntity.lifecycleState === "active"
    ? []
    : input.operationalEntity.lifecycleState === "revoked"
      ? ["ENTITY_REVOKED"]
      : input.operationalEntity.lifecycleState === "suspended"
      ? ["ENTITY_SUSPENDED"]
        : ["ENTITY_NOT_ENROLLED"];
  const technologyProvider = input.evidence[0]?.providerId ?? "not_configured";
  const responsibilityLineage: ResponsibilityLineage = {
    businessOwner: input.operationalEntity.accountableOwnerId,
    controlOwner: input.transactionInput.managedControl?.responsibilityLineage?.controlOwner ?? input.operationalEntity.accountableOwnerId,
    policyApprover: input.transactionInput.managedControl?.responsibilityLineage?.policyApprover ?? input.authority.approver,
    controlOperator: input.transactionInput.managedControl?.responsibilityLineage?.controlOperator ?? "customer:unassigned",
    technologyProvider: input.transactionInput.managedControl?.responsibilityLineage?.technologyProvider ?? technologyProvider,
    identityAuthorizationProvider: input.transactionInput.managedControl?.responsibilityLineage?.identityAuthorizationProvider ?? technologyProvider,
    operationalEntity: input.operationalEntity.entityId,
    runtimeProvider: input.transactionInput.managedControl?.responsibilityLineage?.runtimeProvider ?? "runtime:not_observed",
    destinationSystem: input.transactionInput.managedControl?.responsibilityLineage?.destinationSystem ?? input.transactionInput.action.resource,
    evidenceProvider: input.transactionInput.managedControl?.responsibilityLineage?.evidenceProvider ?? technologyProvider,
    independentConfirmationSource: input.transactionInput.managedControl?.responsibilityLineage?.independentConfirmationSource ?? null,
    reviewer: input.transactionInput.managedControl?.responsibilityLineage?.reviewer ?? null,
  };
  const managedEvidence: ManagedControlEvidence[] = input.evidence.map((item) => ({
    evidenceId: item.reference,
    providerId: item.providerId,
    sourcePartyId: item.sourcePartyId ?? item.providerId,
    sourceClassification: item.sourceClassification ?? "provider_asserted",
    claim: item.outcome === "PASSED" ? "success" : item.outcome === "FAILED" ? "failure" : "unknown",
    providerNativeEventId: item.providerEventId,
    normalizedEvidence: { type: item.type, outcome: item.outcome, assuranceLevel: item.assuranceLevel },
    evidenceDigest: item.sourceDigest,
    schemaVersion: item.schemaVersion ?? "1.0",
    observedAt: item.observedAt,
    supersedesEvidenceId: null,
    correctionOfEvidenceId: null,
  }));
  const evidenceIndependence = classifyEvidenceIndependence({
    evidence: managedEvidence,
    controlOperator: responsibilityLineage.controlOperator,
    technologyProvider: responsibilityLineage.technologyProvider,
  });
  const consequenceEvaluation = classifyOperationalConsequence({
    entity: input.operationalEntity,
    requestedAction: input.transactionInput.action.type,
    target: input.transactionInput.action.resource,
    tool: input.transactionInput.action.type,
    resource: input.transactionInput.action.resource,
    environment: input.transactionInput.action.environment,
    dataBoundary: /restricted|payment|financial|health|personal|credential|secret/i.test(`${input.transactionInput.action.resource} ${input.transactionInput.action.purpose}`) ? "restricted" : "standard",
    authority: { scope: input.authority.permittedScope },
    policy: { requiresHumanApproval: input.authority.humanReviewThresholds.length > 0 },
    businessContext: input.transactionInput.action.purpose,
    incidentContext: input.trustObject.activeIncidents[0]?.id ?? null,
  });
  const consequence = ["low", "moderate", "high", "critical"].includes(input.operationalEntity.currentConsequenceClassification)
    ? input.operationalEntity.currentConsequenceClassification
    : consequenceEvaluation.classification;
  const negativeEvidence = input.evidence.some((item) => item.outcome === "FAILED");
  const authorityIntegrity = input.transactionInput.managedControl?.authorityIntegrity
    ? evaluateAuthorityIntegrity(input.transactionInput.managedControl.authorityIntegrity)
    : null;
  if (authorityIntegrity && authorityIntegrity.actionTimeEvidence.enterpriseId !== input.tenant.id) throw new Error("AUTHORITY_INTEGRITY_TENANT_SCOPE_MISMATCH");
  const approvedModelState = input.transactionInput.deploymentContext?.approvedModelState ?? null;
  const currentObservedModelState = input.transactionInput.deploymentContext?.currentObservedModelState ?? null;
  const incompleteModelStateEvidence = Boolean(approvedModelState) !== Boolean(currentObservedModelState);
  const modelStateIntegrity = approvedModelState && currentObservedModelState
    ? evaluateModelStateIntegrity({
        enterpriseId: input.tenant.id,
        approved: approvedModelState,
        observed: currentObservedModelState,
        evaluatedAt: input.requestedAt,
        provenance: input.transactionInput.deploymentContext?.modelStateChangeProvenance,
        validation: input.transactionInput.deploymentContext?.modelValidation,
        retrospectiveAdvisory: input.transactionInput.deploymentContext?.retrospectiveModelStateAdvisory,
        previousAssessment: input.previous?.trustTwin?.modelStateIntegrity ?? null,
        actionReference: `${input.transactionInput.action.type}:${input.transactionInput.action.resource}`,
        destinationReference: input.transactionInput.action.resource,
      })
    : null;
  const suppliedForecastInput = input.transactionInput.managedControl?.trustForecast;
  const subjectTypeMap: Record<string, ForecastSubjectType> = {
    human: "HUMAN",
    ai_agent: "AI_AGENT",
    software_agent: "SOFTWARE_AGENT",
    workload: "WORKLOAD",
    machine: "MACHINE",
    robot: "ROBOT",
  };
  const authorityIntegrityFindings = authorityIntegrity?.findings.map((item) => item.code) ?? [];
  const modelStateFindings = modelStateIntegrity?.findings.map((item) => item.code) ?? (incompleteModelStateEvidence ? ["MODEL_STATE_EVIDENCE_INCOMPLETE"] : []);
  const contextualForecastFindings = (input.transactionInput.managedControl?.contextEvidence ?? [])
    .flatMap((item) => [item.evidenceType, item.outcome])
    .filter((finding) => ["MODEL_CONTROLLED_SECURITY_BOUNDARY", "MONITORING_COVERAGE_GAP", "IDENTITY_DISCONTINUITY", "STALE_AUTHORITY_STILL_ACTIVE"].includes(finding));
  const derivedForecastInput = createPreActionTrustForecastInput({
    enterpriseId: input.tenant.id,
    subject: { type: subjectTypeMap[input.operationalEntity.entityType] ?? subjectTypeMap[input.transactionInput.trustObject.subjectType] ?? "WORKLOAD", id: input.operationalEntity.entityId },
    evaluatedAt: input.requestedAt,
    policyReference: `${input.policy.id}:${input.policy.version}`,
    actorReference: `actor:${input.actor.id}`,
    authorityReference: input.authority.contractId,
    authorityScopeValid: input.authorityScopeValid,
    actionReference: `${input.transactionInput.action.type}:${input.transactionInput.action.resource}`,
    toolReference: input.transactionInput.action.type,
    parameterProvenanceReference: input.transactionInput.action.payloadDigest ? `digest:${input.transactionInput.action.payloadDigest}` : null,
    runtimeReference: `${input.operationalEntity.entityType}:${input.operationalEntity.lifecycleState}`,
    monitoringCoverage: input.transactionInput.managedControl?.monitoringCoverage ?? "unknown",
    destinationReference: input.transactionInput.action.resource,
    humanApproval: input.transactionInput.managedControl?.humanIntent?.signed || input.transactionInput.managedControl?.humanIntent?.status === "provided"
      ? "provided"
      : input.authority.humanReviewThresholds.length
        ? input.transactionInput.managedControl?.humanIntent?.status ?? "not_provided"
        : "not_required",
    consequence,
    evidenceReferences: input.evidence.map((item) => item.reference),
    evidenceFresh: input.evidenceFresh,
    evidenceComplete,
    recentChanges: input.transactionInput.deploymentContext?.materialChanges ?? [],
    authorityIntegrityFindings: [...new Set([...authorityIntegrityFindings, ...contextualForecastFindings, ...modelStateFindings])],
    canonicalTransactionReference: input.correlationId,
  });
  const forecastInput = suppliedForecastInput ?? derivedForecastInput;
  const trustTwin = createTrustTwin({
    enterpriseId: input.tenant.id,
    entity: { id: input.operationalEntity.entityId, type: forecastInput.subject.type },
    owner: input.operationalEntity.accountableOwnerId,
    purpose: input.transactionInput.action.purpose,
    evaluatedAt: input.requestedAt,
    actionContext: { type: input.transactionInput.action.type, purpose: input.transactionInput.action.purpose, environment: input.transactionInput.action.environment },
    authorityContext: { reference: input.authority.contractId, scopeValid: input.authorityScopeValid },
    forecastInput: {
      ...forecastInput,
      authorityIntegrityFindings: [...new Set([...(forecastInput.authorityIntegrityFindings ?? []), ...authorityIntegrityFindings, ...modelStateFindings])],
    },
    consequenceReach: {
      systems: [...new Set([...input.operationalEntity.environmentReferences, ...input.operationalEntity.workflowReferences, input.transactionInput.action.resource])],
      credentials: [input.authority.contractId],
      tools: [input.transactionInput.action.type],
      dataClasses: [consequence, /restricted|payment|financial|health|personal|credential|secret/i.test(`${input.transactionInput.action.resource} ${input.transactionInput.action.purpose}`) ? "restricted" : "standard"],
      destinations: [input.transactionInput.action.resource],
      downstreamAgents: [],
      productionResources: /prod/i.test(input.transactionInput.action.environment) ? [input.transactionInput.action.resource] : [],
      financialExposure: /payment|financial|transfer|currency|eur|usd|gbp/i.test(`${input.transactionInput.action.type} ${input.transactionInput.action.purpose} ${input.transactionInput.action.resource}`) ? [input.transactionInput.action.resource] : [],
      humanImpactingSystems: input.operationalEntity.entityType === "robot" ? [input.transactionInput.action.resource] : [],
    },
    budgetContext: {
      consequenceSeverity: consequence.toUpperCase(),
      dataSensitivity: /restricted|payment|financial|health|personal|credential|secret/i.test(`${input.transactionInput.action.resource} ${input.transactionInput.action.purpose}`) ? "RESTRICTED" : "STANDARD",
      privilegeLevel: input.authorityScopeValid ? "WITHIN_CURRENT_SCOPE" : "OUTSIDE_CURRENT_SCOPE",
      financialExposure: /payment|financial|transfer|currency|eur|usd|gbp/i.test(`${input.transactionInput.action.type} ${input.transactionInput.action.purpose} ${input.transactionInput.action.resource}`) ? "MATERIAL" : "NONE_OBSERVED",
      reversibility: /read|inspect|list|query/i.test(input.transactionInput.action.type) ? "HIGH" : "UNKNOWN",
      humanSafetyImpact: input.operationalEntity.entityType === "robot" ? "POTENTIAL" : "NONE_OBSERVED",
      regulatorySensitivity: /payment|financial|health|personal/i.test(`${input.transactionInput.action.resource} ${input.transactionInput.action.purpose}`) ? "SENSITIVE" : "STANDARD",
      authorityScope: input.authorityScopeValid ? "WITHIN_CURRENT_SCOPE" : "OUTSIDE_CURRENT_SCOPE",
      policyTolerance: ["high", "critical"].includes(consequence) ? "STRICT" : "STANDARD",
      monitoringConfidence: input.transactionInput.managedControl?.monitoringCoverage === "covered" ? 1 : input.transactionInput.managedControl?.monitoringCoverage === "partial" ? 0.5 : 0,
    },
    verificationPolicy: { policyReference: `${input.policy.id}:${input.policy.version}`, policyVersion: input.policy.version },
    verificationEvidence: [
      ...input.evidence.map((item) => ({ evidenceType: item.type, providerClass: /identity|mfa|session/i.test(item.type) ? "IDENTITY_PROVIDER" : /runtime|attestation|monitor/i.test(item.type) ? "RUNTIME_SECURITY_PROVIDER" : "APPLICATION_SIGNAL", providerKey: item.providerId, observedAt: item.observedAt, expiresAt: item.expiresAt, outcome: item.outcome, evidenceReferences: [item.reference], assurance: item.assuranceLevel, retestReference: null })),
      ...(input.transactionInput.managedControl?.contextEvidence ?? []).map((item) => ({ evidenceType: item.evidenceType, providerClass: item.providerClass, providerKey: item.providerKey, observedAt: item.observedAt, expiresAt: null, outcome: item.outcome, evidenceReferences: [`digest:${item.evidenceDigest}`], assurance: null, retestReference: typeof item.metadata?.retestReference === "string" ? item.metadata.retestReference : null })),
      ...(input.transactionInput.deploymentContext?.assuranceEvidence ?? []).map((item) => ({ evidenceType: `${item.methodReference} runtime attestation model tool configuration`, providerClass: "AI_ASSURANCE_PROVIDER", providerKey: item.providerKey, observedAt: item.occurredAt, expiresAt: item.expiresAt, outcome: item.confidence, evidenceReferences: [`digest:${item.evidenceDigest}`], assurance: item.assurance, retestReference: item.retestReference })),
      ...(input.transactionInput.managedControl?.humanIntent?.reference ? [{ evidenceType: "SIGNED_HUMAN_INTENT", providerClass: "APPLICATION_SIGNAL", providerKey: "human_intent", observedAt: input.requestedAt, expiresAt: null, outcome: input.transactionInput.managedControl.humanIntent.status ?? "provided", evidenceReferences: [input.transactionInput.managedControl.humanIntent.reference], assurance: 1, retestReference: null }] : []),
    ],
    proposedChanges: [...new Set([...(input.transactionInput.deploymentContext?.materialChanges ?? []), ...authorityIntegrityFindings, ...contextualForecastFindings, ...modelStateFindings])],
    previousTwin: input.previous?.trustTwin ?? null,
    modelStateIntegrity,
  });
  const trustForecast = trustTwin.trustForecast;
  const sentinelTrustBrief = createSentinelTrustBrief({
    enterpriseId: input.tenant.id,
    currentTwin: trustTwin,
    evaluatedAt: input.requestedAt,
  });
  if (trustTwin.enterpriseId !== input.tenant.id) throw new Error("TRUST_TWIN_TENANT_SCOPE_MISMATCH");
  if (trustForecast && trustForecast.enterpriseId !== input.tenant.id) throw new Error("TRUST_FORECAST_TENANT_SCOPE_MISMATCH");
  const contextEvidenceTypes = new Set((input.transactionInput.managedControl?.contextEvidence ?? []).map((item) => item.evidenceType));
  const contextContradictions = [
    ...(input.transactionInput.managedControl?.contradictions ?? []),
    ...(authorityIntegrity?.findings.map((item) => item.code) ?? []),
    ...(authorityIntegrity?.requiredActions.filter((item) => item !== "NO_ACTION_REQUIRED") ?? []),
    ...modelStateFindings,
  ];
  const contextReviewRequired = [...contextEvidenceTypes, ...contextContradictions].some((type) =>
    /(?:MISMATCH|GAP|CONFLICT|DISAGREEMENT|UNPROVEN|INVALID|STALE|DRIFT|INCOMPLETE|ORIGIN_UNRESOLVED|REASSESSMENT_REQUIRED|SPOOFING|INJECTION|OFFLINE|REVALIDATION_REQUIRED|UNCERTAIN|UNAVAILABLE)/.test(type),
  );
  const evidenceConflict = evidenceIndependence === "conflicting" || input.trustObject.activeContradictions.length > 0 || contextReviewRequired;
  const independenceScore = evidenceIndependence === "independently_confirmed" ? 1
    : evidenceIndependence === "multi_source" ? 0.85
      : ["single_source", "same_party_multi_system", "provider_and_operator_same_party"].includes(evidenceIndependence) ? 0.45
        : 0;
  const confidence = deriveTrustConfidence({
    evidenceCompleteness: evidenceComplete ? 1 : 0.35,
    evidenceFreshness: input.evidenceFresh ? 1 : 0.2,
    sourceIndependence: independenceScore,
    providerAgreement: evidenceConflict ? 0 : negativeEvidence ? 0.2 : 1,
    authorityCertainty: input.authorityScopeValid ? 1 : 0,
    outcomeConfirmation: 0.5,
    continuity: input.trustObject.environmentState === "verified" ? 1 : 0.25,
    unresolvedContradictions: input.trustObject.activeContradictions.length,
    evidenceReferences: input.evidence.map((item) => item.reference),
  });
  const hardDenyReasons = new Set(["AUTHORITY_REQUIREMENT_UNSATISFIED", "ENVIRONMENT_REQUIREMENT_UNSATISFIED", "SCOPE_OUTSIDE_CONTRACT", "PROVIDER_OUTSIDE_CONTRACT", "INCIDENT_THRESHOLD_REACHED", "CONTRACT_REVOKED", "AUTHORITY_REVOKED"]);
  const inactiveEntity = ["suspended", "revoked", "retired", "expired"].includes(input.operationalEntity.lifecycleState);
  const unreadyEntity = input.operationalEntity.lifecycleState !== "active";
  const highConsequenceIndependenceGap = ["high", "critical"].includes(consequence) && !["multi_source", "independently_confirmed"].includes(evidenceIndependence);
  const requestedEnforcement = input.transactionInput.managedControl?.enforcementState;
  const continuityConflict = requestedEnforcement?.runtimeObservation === "not_enforced" || requestedEnforcement?.destinationObservation === "not_enforced";
  const activeIncidentReview = input.trustObject.activeIncidents.length > 0;
  const delegatedAuthorization = input.transactionInput.managedControl?.authorization;
  const deploymentGate = deriveDeploymentGate({
    decisionType: input.transactionInput.decisionType,
    deploymentContext: input.transactionInput.deploymentContext,
    requestedAt: input.requestedAt,
    evidenceFresh: input.evidenceFresh,
    trustForecast,
    modelStateIntegrity,
  });
  const forecastRequiresReview = input.transactionInput.decisionType === "AI_DEPLOYMENT_TRUST_GATE"
    && trustForecast !== null
    && ["REVIEW_REQUIRED", "HOLD", "DO_NOT_RELEASE"].includes(trustForecast.deploymentRecommendation);
  let decision: CanonicalTransactionDecision = "ALLOW";
  if (delegatedAuthorization?.decision === "DENY" || inactiveEntity || missingAccountability || !input.authorityScopeValid || negativeEvidence || evaluation.reasonCodes.some((reason) => hardDenyReasons.has(reason)) || evaluation.outcome === "revoked") decision = "DENY";
  else if (
    delegatedAuthorization?.decision === "REVIEW"
    || unreadyEntity
    || !evidenceComplete
    || !input.evidenceFresh
    || evidenceConflict
    || highConsequenceIndependenceGap
    || continuityConflict
    || activeIncidentReview
    || contextReviewRequired
    || Boolean(authorityIntegrity?.findings.length)
    || forecastRequiresReview
    || (input.transactionInput.managedControl?.oversightMode === "AUTONOMOUS" && ["high", "critical"].includes(consequence))
    || deploymentGate?.reauthorizationRequired
    || ["paused", "review_required", "satisfied_with_degraded_evidence"].includes(evaluation.outcome)
  ) decision = "REVIEW";
  const trustState: CanonicalOperationalState = decision === "ALLOW" ? "verified" : decision === "REVIEW" ? "degraded" : "suspended";
  const reasonCodes = [...new Set([
    ...evaluation.reasonCodes,
    ...(delegatedAuthorization?.reasonCodes ?? []),
    ...entityStateReason,
    ...(missingAccountability ? ["ACCOUNTABLE_OWNER_MISSING"] : []),
    ...(input.authorityScopeValid ? ["AUTHORITY_SCOPE_VALID"] : ["AUTHORITY_SCOPE_INVALID"]),
    ...(input.evidence.length ? [] : ["EVIDENCE_MISSING"]),
    ...(evidenceComplete ? ["EVIDENCE_SUFFICIENT"] : ["EVIDENCE_INSUFFICIENT"]),
    ...(input.evidenceFresh ? ["EVIDENCE_CURRENT"] : ["EVIDENCE_STALE_OR_UNAVAILABLE"]),
    ...(evidenceConflict ? ["EVIDENCE_CONFLICT"] : []),
    ...(highConsequenceIndependenceGap ? ["INDEPENDENT_EVIDENCE_REQUIRED_FOR_CONSEQUENCE"] : []),
    ...(continuityConflict ? ["RUNTIME_OR_DESTINATION_CONTINUITY_CONFLICT"] : []),
    ...(activeIncidentReview ? ["ACTIVE_INCIDENT_REQUIRES_REVIEW"] : []),
    ...(negativeEvidence ? ["NEGATIVE_PROVIDER_EVIDENCE"] : []),
    ...contextContradictions,
    ...(input.transactionInput.managedControl?.oversightMode ? [`OVERSIGHT_${input.transactionInput.managedControl.oversightMode}`] : []),
    ...(deploymentGate?.reauthorizationRequired ? ["REAUTHORIZATION_REQUIRED"] : []),
    ...(deploymentGate?.assuranceFreshness === "ASSURANCE_INVALIDATED_BY_CHANGE" ? ["ASSURANCE_INVALIDATED_BY_CHANGE"] : []),
    ...(trustForecast ? [`TRUST_FORECAST_${trustForecast.state}`, `TRUST_FORECAST_RECOMMENDS_${trustForecast.deploymentRecommendation}`] : []),
    ...(forecastRequiresReview ? ["TRUST_FORECAST_REQUIRES_CANONICAL_REVIEW"] : []),
    `ADAPTIVE_VERIFICATION_DEPTH_${trustTwin.adaptiveVerification.requiredVerificationDepth}`,
    `ADAPTIVE_VERIFICATION_STATUS_${trustTwin.adaptiveVerification.verificationStatus}`,
    ...(trustTwin.adaptiveVerification.trustGap.exists ? ["TRUST_GAP_OPEN", ...trustTwin.adaptiveVerification.missingEvidence.map((item) => `MISSING_${item}`)] : []),
    ...(modelStateIntegrity ? [`MODEL_INTEGRITY_${modelStateIntegrity.modelIntegrityState}`, ...modelStateIntegrity.findings.map((item) => item.code)] : []),
    `CONSEQUENCE_${consequence.toUpperCase()}`,
    `CONCLUSION_CONFIDENCE_${confidence.level}`,
  ])].sort();
  const changedConditions = [
    ...conditionChanges(input.previous, evidenceDigest, input.authority.contractId, input.policy.version),
    ...(authorityIntegrity?.trustMemoryEvents.length ? ["AUTHORITY_INTEGRITY_MATERIAL_EVENT"] : []),
    ...(trustForecast?.trustMemoryEvents.length ? ["TRUST_FORECAST_MATERIAL_EVENT"] : []),
    ...(trustTwin.trustMemoryEvents.length ? ["TRUST_TWIN_MATERIAL_EVENT"] : []),
    ...(trustTwin.adaptiveVerification.trustMemoryEvents.length ? ["ADAPTIVE_VERIFICATION_MATERIAL_EVENT"] : []),
    ...(modelStateIntegrity?.trustMemoryEvents.length ? ["MODEL_STATE_INTEGRITY_MATERIAL_EVENT"] : []),
  ];
  const materialChange = !input.previous || input.previous.trustState !== trustState || changedConditions.length > 0;
  const transactionId = deterministicUuid({ enterpriseId: input.tenant.id, idempotencyKey: input.transactionInput.idempotencyKey });
  const decisionEnvelope = createDecisionEnvelope({
    enterpriseId: input.tenant.id,
    subject: input.trustObject.subject,
    workflow: input.authority.workflow,
    decisionType: "scope",
    outcome: decision,
    trustState,
    reasonCodes,
    evidenceReferences: [...evidenceReferences, ...authorityEvidenceReferences],
    policyId: input.policy.id,
    policyVersion: input.policy.version,
    evaluator: "canonical_trust_transaction",
    evaluatorVersion: "1.0.0",
    actorOrSystemAuthority: input.actor.authority,
    humanReviewRequired: decision === "REVIEW",
    createdAt: input.requestedAt,
    supersededDecisionId: null,
    correlationId: input.correlationId,
    legalDecisionReference: null,
  });
  const enforcementState: EnforcementChain = {
    policyDecision: decision,
    controlOwnerApproval: null,
    operatorRequest: null,
    technologyProviderRequest: null,
    providerAcknowledgement: null,
    providerEnforcementClaim: null,
    runtimeObservation: null,
    destinationObservation: null,
    businessOutcome: null,
    ...input.transactionInput.managedControl?.enforcementState,
  };
  const deploymentAssuranceEvidence = Array.isArray(input.transactionInput.deploymentContext?.assuranceEvidence)
    ? input.transactionInput.deploymentContext!.assuranceEvidence.map((item) => normalizeProviderNeutralEvidence({
        providerId: item.providerKey || "external_unattributed",
        providerName: item.providerKey || "assurance_provider",
        evidenceType: "AI_BEHAVIOR_ASSESSMENT",
        observedAt: item.occurredAt || input.requestedAt,
        outcome: "PASSED",
        evidenceDigest: item.evidenceDigest,
        correlationId: item.assessmentId,
        providerClass: "AI_ASSURANCE_PROVIDER",
        providerKey: item.providerKey,
        environment: item.environment,
        scope: item.scope,
        modelVersion: item.modelVersion,
        permissionContext: item.permissionContext,
        assurance: item.assurance,
        confidence: item.confidence,
        findingReferences: item.findingReferences,
        retestReference: item.retestReference,
      }))
    : [];
  const providerNeutralEvidence = [
    ...input.evidence.map((item) => normalizeProviderNeutralEvidence({
      providerId: item.providerId,
      providerName: item.providerId.replace(/_/g, " "),
      evidenceType: item.type,
      observedAt: item.observedAt,
      outcome: item.outcome,
      evidenceDigest: item.sourceDigest,
      correlationId: item.correlationId,
    })),
    ...deploymentAssuranceEvidence,
    ...(input.transactionInput.managedControl?.contextEvidence ?? []).map((item) => normalizeProviderNeutralEvidence({
      providerId: item.providerKey,
      providerName: item.providerKey.replace(/[_-]/g, " "),
      evidenceType: item.evidenceType,
      observedAt: item.observedAt,
      outcome: item.outcome,
      evidenceDigest: item.evidenceDigest,
      providerClass: item.providerClass,
      providerKey: item.providerKey,
      evidenceContext: item.metadata ?? null,
    })),
    ...(authorityIntegrity?.providerNeutralEvidence ?? []).map((item) => normalizeProviderNeutralEvidence({
      providerId: item.providerId,
      providerName: item.providerId.replace(/[_-]/g, " "),
      evidenceType: item.evidenceType,
      observedAt: item.observedAt,
      outcome: item.outcome,
      evidenceDigest: item.evidenceDigest,
      providerClass: "APPLICATION_SIGNAL",
      providerKey: item.providerId,
      evidenceContext: item.metadata,
    })),
    ...(trustForecast?.providerNeutralEvidence ?? []).map((item) => normalizeProviderNeutralEvidence({
      providerId: item.providerId,
      providerName: item.providerId.replace(/[_-]/g, " "),
      evidenceType: item.evidenceType,
      observedAt: item.observedAt,
      outcome: item.outcome,
      evidenceDigest: item.evidenceDigest,
      providerClass: "APPLICATION_SIGNAL",
      providerKey: item.providerId,
      evidenceContext: item.metadata,
    })),
    ...(modelStateIntegrity?.providerNeutralEvidence ?? []),
  ];
  const requestedExecutionStages = input.transactionInput.managedControl?.executionStages ?? [];
  const executionContinuity: ExecutionContinuityRecord[] = [
    { stage: "INTENDED_ACTION", status: "observed", occurredAt: input.transactionInput.managedControl?.humanIntent?.status === "provided" ? input.requestedAt : null, evidenceReference: input.transactionInput.managedControl?.humanIntent?.reference ?? null },
    { stage: "REQUESTED_ACTION", status: "observed", occurredAt: input.requestedAt, evidenceReference: `transaction:${transactionId}` },
    { stage: "AUTHORIZED_ACTION", status: decision === "ALLOW" ? "observed" : "not_applicable", occurredAt: decision === "ALLOW" ? input.requestedAt : null, evidenceReference: decision === "ALLOW" ? `decision:${decisionEnvelope.decisionId}` : null },
    ...requestedExecutionStages.filter((item) => !["INTENDED_ACTION", "REQUESTED_ACTION", "AUTHORIZED_ACTION"].includes(item.stage)),
  ];
  const continuitySignals = deriveContinuitySignals({
    decision,
    consequence,
    authority: input.authority,
    evidenceFresh: input.evidenceFresh,
    trustObject: input.trustObject,
    responsibilityLineage,
    transactionInput: input.transactionInput,
    providerNeutralEvidence,
  });
  const decisionTimeSnapshot = createDecisionTimeSnapshot({
    frozenAt: input.requestedAt,
    operationalEntityVersion: input.operationalEntity.canonicalDigest,
    externalIdentityReferences: input.operationalEntity.externalIdentityReferences,
    accountableHuman: input.operationalEntity.accountableOwnerId,
    authorityLineageReferences: [input.authority.contractId, ...authorityEvidenceReferences.map((reference) => `${reference.type}:${reference.id}`)],
    responsibilityLineage,
    providerHealth: input.transactionInput.managedControl?.providerHealth ?? Object.fromEntries(input.evidence.map((item) => [item.providerId, "evidence_received"])),
    providerEvidence: managedEvidence,
    evidenceIndependence,
    policyVersion: `${input.policy.id}:${input.policy.version}`,
    configurationRulesetDigest: input.transactionInput.managedControl?.configurationRulesetDigest ?? input.policy.policyHash,
    enforcementState,
    contradictions: input.transactionInput.managedControl?.contradictions ?? input.trustObject.activeContradictions.map((item) => item.id),
    activeIncidentReferences: input.trustObject.activeIncidents.map((item) => item.id),
    consequence,
    confidenceInConclusion: confidence.level,
    decisionDigest: decisionEnvelope.deterministicDigest,
    authorityIntegrity,
    trustForecast,
    trustTwin,
    sentinelTrustBrief,
    modelStateIntegrity,
    reviewerState: input.transactionInput.managedControl?.reviewerState ?? (decision === "REVIEW" ? "required" : "not_required"),
  });
  return {
    transactionId,
    enterpriseId: input.tenant.id,
    actorId: input.actor.id,
    actorType: input.actor.type,
    operationalEntityId: input.operationalEntity.entityId,
    accountableOwnerId: input.operationalEntity.accountableOwnerId,
    entityType: input.operationalEntity.entityType,
    entityLifecycleState: input.operationalEntity.lifecycleState,
    trustObject: input.transactionInput.trustObject,
    workflowId: input.authority.workflowId,
    action: input.transactionInput.action,
    idempotencyKey: input.transactionInput.idempotencyKey,
    correlationId: input.correlationId,
    requestedAt: input.requestedAt,
    decision,
    trustState,
    decisionEnvelope,
    decisionReference: decisionEnvelope.decisionId,
    authorityReference: input.authority.contractId,
    authorityEvidenceReferences,
    policy: input.policy,
    evidence: input.evidence,
    evidenceDigest,
    evidenceComplete,
    evidenceFresh: input.evidenceFresh,
    evidenceReferences: [...evidenceReferences, ...authorityEvidenceReferences],
    reasonCodes,
    consequence,
    confidenceInConclusion: confidence.level,
    timestamp: input.requestedAt,
    digest: decisionEnvelope.deterministicDigest,
    previousTransactionId: input.previous?.transactionId ?? null,
    changedConditions,
    materialChange,
    responsibilityLineage,
    evidenceIndependence,
    decisionTimeSnapshot,
    continuitySignals,
    providerNeutralEvidence,
    deploymentGate,
    executionContinuity,
    authorityIntegrity,
    trustForecast,
    trustTwin,
    adaptiveVerification: trustTwin.adaptiveVerification,
    sentinelTrustBrief,
    modelStateIntegrity,
  };
}

export async function persistDecision(dependencies: CanonicalTrustTransactionDependencies, record: CanonicalDecisionRecord) { return dependencies.persistDecision(record); }
export async function extendEvidenceGraph(dependencies: CanonicalTrustTransactionDependencies, record: PersistedCanonicalDecision) { return dependencies.extendEvidenceGraph(record); }
export async function appendReplay(dependencies: CanonicalTrustTransactionDependencies, record: PersistedCanonicalDecision) { return dependencies.appendReplay(record); }
export async function emitMaterialTrustMemory(dependencies: CanonicalTrustTransactionDependencies, record: PersistedCanonicalDecision) { return record.materialChange ? dependencies.emitTrustMemory(record) : null; }
export async function requestExternalExecutionIfAllowed(dependencies: CanonicalTrustTransactionDependencies, record: PersistedCanonicalDecision) {
  if (record.decision !== "ALLOW") return { configured: false, requestReference: null, acknowledgement: null, outcome: null } satisfies ExternalExecutionResult;
  return dependencies.requestExternalExecution(record);
}
export async function recordExternalAcknowledgement(dependencies: CanonicalTrustTransactionDependencies, record: PersistedCanonicalDecision, result: ExternalExecutionResult) {
  return result.acknowledgement ? dependencies.recordExternalAcknowledgement(record, result.acknowledgement) : null;
}
export async function recordExternalOutcome(dependencies: CanonicalTrustTransactionDependencies, record: PersistedCanonicalDecision, result: ExternalExecutionResult) {
  if (record.decision !== "ALLOW" || !result.configured) return null;
  const outcome = result.outcome ?? { state: "UNKNOWN" as const, externalReference: null, occurredAt: new Date().toISOString(), reason: "The relay acknowledged no final outcome." };
  return dependencies.recordExternalOutcome(record, outcome);
}

export function returnSafeTransactionReceipt(input: {
  context: TransactionContext;
  persisted: PersistedCanonicalDecision;
  evidenceGraphReference: string;
  replayReference: string;
  trustMemoryReference: string | null;
  external: ExternalExecutionResult;
  acknowledgementReference: string | null;
  outcomeReference: string | null;
}): SafeCanonicalTransactionReceipt {
  const { persisted, context } = input;
  const outcome = persisted.decision !== "ALLOW" ? "NOT_REQUESTED" : !input.external.configured ? "NOT_CONFIGURED" : input.external.outcome?.state ?? "UNKNOWN";
  const executionContinuity = [...persisted.executionContinuity];
  if (input.external.requestReference) executionContinuity.push({ stage: "COMMAND_SENT", status: "observed", occurredAt: persisted.timestamp, evidenceReference: input.external.requestReference });
  if (input.acknowledgementReference) executionContinuity.push({ stage: "COMMAND_ACKNOWLEDGED", status: "observed", occurredAt: input.external.acknowledgement?.acknowledgedAt ?? persisted.timestamp, evidenceReference: input.acknowledgementReference });
  if (input.external.outcome?.state === "SUCCEEDED") executionContinuity.push({ stage: "ACTION_EXECUTED", status: "observed", occurredAt: input.external.outcome.occurredAt, evidenceReference: input.outcomeReference });
  if (input.outcomeReference) executionContinuity.push({ stage: "CONSEQUENCE_OBSERVED", status: input.external.outcome?.state === "UNKNOWN" ? "missing" : "observed", occurredAt: input.external.outcome?.occurredAt ?? null, evidenceReference: input.outcomeReference });
  return {
    transactionId: persisted.transactionId,
    correlationId: persisted.correlationId,
    enterpriseId: persisted.enterpriseId,
    operationalEntityId: persisted.operationalEntityId,
    accountableOwnerId: persisted.accountableOwnerId,
    entityType: persisted.entityType,
    entityLifecycleState: persisted.entityLifecycleState,
    actor: { id: context.actor.id, type: context.actor.type },
    trustObject: persisted.trustObject,
    action: { type: persisted.action.type, purpose: persisted.action.purpose, resource: persisted.action.resource, environment: persisted.action.environment, requestDigest: persisted.action.payloadDigest },
    decision: persisted.decision,
    trustState: persisted.trustState,
    reasonCodes: persisted.reasonCodes,
    evidence: persisted.evidence.map((item) => ({ reference: item.reference, type: item.type, providerId: item.providerId, providerEventId: item.providerEventId, sourceDigest: item.sourceDigest, outcome: item.outcome, observedAt: item.observedAt, expiresAt: item.expiresAt })),
    evidenceComplete: persisted.evidenceComplete,
    evidenceFresh: persisted.evidenceFresh,
    evidenceReferences: persisted.evidenceReferences,
    authorityReference: persisted.authorityReference,
    authorityLineageReferences: persisted.authorityEvidenceReferences,
    policy: { id: persisted.policy.id, version: persisted.policy.version, hash: persisted.policy.policyHash },
    decisionReference: persisted.decisionReference,
    evidenceGraphReference: input.evidenceGraphReference,
    replayReference: input.replayReference,
    trustMemoryReference: input.trustMemoryReference,
    materialChange: persisted.materialChange,
    changedConditions: persisted.changedConditions,
    responsibilityLineage: persisted.responsibilityLineage,
    evidenceIndependence: persisted.evidenceIndependence,
    decisionTimeSnapshot: persisted.decisionTimeSnapshot,
    continuitySignals: persisted.continuitySignals,
    providerNeutralEvidence: persisted.providerNeutralEvidence,
    deploymentGate: persisted.deploymentGate,
    executionContinuity,
    authorityIntegrity: persisted.authorityIntegrity,
    trustForecast: persisted.trustForecast,
    trustTwin: persisted.trustTwin,
    adaptiveVerification: persisted.adaptiveVerification,
    sentinelTrustBrief: persisted.sentinelTrustBrief,
    modelStateIntegrity: persisted.modelStateIntegrity,
    consequence: persisted.consequence,
    confidenceInConclusion: persisted.confidenceInConclusion,
    timestamp: persisted.timestamp,
    digest: persisted.digest,
    externalExecution: {
      requested: persisted.decision === "ALLOW" && input.external.configured && Boolean(input.external.requestReference),
      requestReference: input.external.requestReference,
      acknowledgementReference: input.acknowledgementReference,
      outcomeReference: input.outcomeReference,
      outcome,
    },
    historyUrl: `/trust/transactions/${persisted.transactionId}`,
    idempotentReplay: persisted.persistenceStatus === "DUPLICATE",
  };
}

export async function executeCanonicalTrustTransaction(input: CanonicalTrustTransactionInput, dependencies: CanonicalTrustTransactionDependencies): Promise<SafeCanonicalTransactionReceipt> {
  assertInput(input);
  const actor = await authenticateActor(dependencies);
  const tenant = await resolveTenantFromSession(dependencies, actor);
  const previousReceipt = await dependencies.findByIdempotency(tenant.id, input.idempotencyKey);
  if (previousReceipt) {
    if (!isSameIdempotentRequest(previousReceipt, input, actor)) {
      throw new TypeError("The idempotency key is already bound to a different canonical request.");
    }
    return { ...previousReceipt, idempotentReplay: true };
  }
  const requestedAt = input.requestedAt ?? new Date().toISOString();
  let operationalEntity: OperationalEntity | null = dependencies.resolveOperationalEntity
    ? await dependencies.resolveOperationalEntity(tenant.id, {
        requestedEntityId: input.operationalEntityId ?? input.trustObject.subjectId,
        legacyHumanId: null,
        agentId: null,
        serviceIdentity: null,
        deviceIdentity: null,
        trustObjectReference: input.trustObject.subjectId,
        tenantId: tenant.id,
        knownEntities: [],
      })
    : null;
  const trustObject = await resolveTrustObject(dependencies, tenant, input);
  operationalEntity ??= createOperationalEntity({
        entityId: input.operationalEntityId ?? input.trustObject.subjectId,
        enterpriseId: tenant.id,
        entityType: input.trustObject.subjectType === "ai_agent" ? "ai_agent" : "other_governed_entity",
        displayReference: input.trustObject.subjectId,
        canonicalTrustObjectId: input.trustObject.subjectId,
        lifecycleState: "active",
        accountableOwnerId: actor.id,
        organizationReference: "legacy_unresolved",
        providerReferences: [],
        identityProfileReference: input.trustObject.subjectId,
        currentAuthorityReferences: ["resolved_by_canonical_transaction"],
        environmentReferences: [input.action.environment],
        workflowReferences: [input.action.type],
        currentTrustState: trustObject.trustState,
        currentEvidenceState: trustObject.evidenceCompleteness,
        currentConsequenceClassification: "unknown",
        canonicalDigest: hashCanonical([input.trustObject.subjectId, input.action.type]),
      });
  const entityCanCollectEvidence = operationalEntity.lifecycleState === "active"
    && Boolean(operationalEntity.accountableOwnerId)
    && operationalEntity.accountableOwnerId !== "legacy_unresolved";
  const evidence = entityCanCollectEvidence ? await collectConfiguredEvidence(dependencies, tenant, trustObject, input) : [];
  const providerEvidenceFresh = validateEvidenceFreshness(evidence, 86_400, requestedAt);
  const authority = await resolveAuthority(dependencies, tenant, trustObject);
  const evidenceFresh = providerEvidenceFresh && validateEvidenceFreshness(evidence, authority.maximumEvidenceAgeSeconds, requestedAt);
  const authorityScopeValid = validateAuthorityScope(authority, input, requestedAt);
  const policy = await resolvePolicyVersion(dependencies, tenant, authority, requestedAt);
  const previous = await dependencies.loadPreviousTransaction(tenant.id, input.previousTransactionId);
  const correlationId = crypto.randomUUID();
  const record = evaluateCanonicalTrustDecision({ tenant, actor, operationalEntity, trustObject, authority, policy, evidence, evidenceFresh, authorityScopeValid, previous, transactionInput: input, requestedAt, correlationId });
  const context: TransactionContext = { input, actor, tenant, operationalEntity, trustObject, authority, policy, evidence, evidenceFresh, authorityScopeValid, previous, record };
  const persisted = await persistDecision(dependencies, record);
  if (persisted.persistenceStatus === "DUPLICATE") {
    const concurrentReceipt = await dependencies.findByIdempotency(tenant.id, input.idempotencyKey);
    if (!concurrentReceipt) throw new Error("IDEMPOTENT_TRANSACTION_RECEIPT_UNAVAILABLE");
    return { ...concurrentReceipt, idempotentReplay: true };
  }
  const evidenceGraphReference = await extendEvidenceGraph(dependencies, persisted);
  const replayReference = await appendReplay(dependencies, persisted);
  const trustMemoryReference = await emitMaterialTrustMemory(dependencies, persisted);
  const external = await requestExternalExecutionIfAllowed(dependencies, persisted);
  const acknowledgementReference = await recordExternalAcknowledgement(dependencies, persisted, external);
  const outcomeReference = await recordExternalOutcome(dependencies, persisted, external);
  return returnSafeTransactionReceipt({ context, persisted, evidenceGraphReference, replayReference, trustMemoryReference, external, acknowledgementReference, outcomeReference });
}
