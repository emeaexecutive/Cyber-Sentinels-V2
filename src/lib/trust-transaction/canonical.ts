import { createDecisionEnvelope } from "../trust-fabric/control-plane.ts";
import { evaluateTrustContract } from "../trust-fabric/contracts.ts";
import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import type {
  EnterpriseSubjectClass,
  EnterpriseTrustObject,
  FabricReference,
  TrustContract,
  TrustFabricDecisionEnvelope,
} from "../trust-fabric/types.ts";

export type CanonicalTransactionDecision = "ALLOW" | "REVIEW" | "DENY";
export type CanonicalOperationalState = "verified" | "degraded" | "suspended";
export type ExternalOutcomeState = "SUCCEEDED" | "FAILED" | "UNKNOWN";

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
  providerExecutionId?: string | null;
  previousTransactionId?: string | null;
  requestedAt?: string;
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
};
export type CanonicalDecisionRecord = {
  transactionId: string;
  enterpriseId: string;
  actorId: string;
  trustObject: CanonicalTrustTransactionInput["trustObject"];
  workflowId: string;
  action: CanonicalTrustTransactionInput["action"];
  idempotencyKey: string;
  correlationId: string;
  requestedAt: string;
  decision: CanonicalTransactionDecision;
  trustState: CanonicalOperationalState;
  decisionEnvelope: TrustFabricDecisionEnvelope;
  decisionReference: string;
  authorityReference: string;
  authorityEvidenceReferences: FabricReference[];
  policy: ResolvedPolicyVersion;
  evidence: StoredProviderEvidence[];
  evidenceDigest: string;
  evidenceComplete: boolean;
  evidenceFresh: boolean;
  reasonCodes: string[];
  previousTransactionId: string | null;
  changedConditions: string[];
  materialChange: boolean;
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
  actor: { id: string; type: string };
  trustObject: CanonicalTrustTransactionInput["trustObject"];
  action: Omit<CanonicalTrustTransactionInput["action"], "payloadDigest"> & { requestDigest: string };
  decision: CanonicalTransactionDecision;
  trustState: CanonicalOperationalState;
  evidence: Array<{ reference: string; providerId: string; providerEventId: string; sourceDigest: string; outcome: string; observedAt: string; expiresAt: string | null }>;
  evidenceComplete: boolean;
  evidenceFresh: boolean;
  authorityReference: string;
  authorityLineageReferences: FabricReference[];
  policy: { id: string; version: string; hash: string };
  decisionReference: string;
  evidenceGraphReference: string;
  replayReference: string;
  trustMemoryReference: string | null;
  materialChange: boolean;
  changedConditions: string[];
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
  loadConfiguredEvidence(input: { enterpriseId: string; subjectId: string; providerExecutionId?: string | null }): Promise<StoredProviderEvidence[]>;
  loadAuthority(enterpriseId: string, subjectType: EnterpriseSubjectClass, subjectId: string): Promise<TrustContract>;
  loadPolicy(enterpriseId: string, policyId: string, policyVersion: string): Promise<ResolvedPolicyVersion>;
  loadPreviousTransaction(enterpriseId: string, transactionId?: string | null): Promise<PreviousCanonicalTransaction | null>;
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
  const evidence = await dependencies.loadConfiguredEvidence({ enterpriseId: tenant.id, subjectId: trustObject.subjectId, providerExecutionId: input.providerExecutionId });
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

export async function resolvePolicyVersion(dependencies: CanonicalTrustTransactionDependencies, tenant: SessionTenant, authority: TrustContract, at: string) {
  const policy = await dependencies.loadPolicy(tenant.id, authority.policyId, authority.policyVersion);
  const time = Date.parse(at);
  if (!policy.active || Date.parse(policy.validFrom) > time || (policy.validUntil && Date.parse(policy.validUntil) <= time)) throw new Error("POLICY_VERSION_INACTIVE");
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

export function evaluateCanonicalTrustDecision(input: {
  tenant: SessionTenant;
  actor: AuthenticatedTransactionActor;
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
  const negativeEvidence = input.evidence.some((item) => item.outcome === "FAILED");
  const hardDenyReasons = new Set(["AUTHORITY_REQUIREMENT_UNSATISFIED", "ENVIRONMENT_REQUIREMENT_UNSATISFIED", "SCOPE_OUTSIDE_CONTRACT", "PROVIDER_OUTSIDE_CONTRACT", "INCIDENT_THRESHOLD_REACHED", "CONTRACT_REVOKED", "AUTHORITY_REVOKED"]);
  let decision: CanonicalTransactionDecision = "ALLOW";
  if (!input.authorityScopeValid || negativeEvidence || evaluation.reasonCodes.some((reason) => hardDenyReasons.has(reason)) || evaluation.outcome === "revoked") decision = "DENY";
  else if (!input.evidenceFresh || ["paused", "review_required", "satisfied_with_degraded_evidence"].includes(evaluation.outcome)) decision = "REVIEW";
  const trustState: CanonicalOperationalState = decision === "ALLOW" ? "verified" : decision === "REVIEW" ? "degraded" : "suspended";
  const reasonCodes = [...new Set([
    ...evaluation.reasonCodes,
    ...(input.authorityScopeValid ? ["AUTHORITY_SCOPE_VALID"] : ["AUTHORITY_SCOPE_INVALID"]),
    ...(input.evidence.length ? [] : ["EVIDENCE_MISSING"]),
    ...(input.evidenceFresh ? ["EVIDENCE_COMPLETE_AND_FRESH"] : ["EVIDENCE_INCOMPLETE_OR_STALE"]),
    ...(negativeEvidence ? ["NEGATIVE_PROVIDER_EVIDENCE"] : []),
  ])].sort();
  const changedConditions = conditionChanges(input.previous, evidenceDigest, input.authority.contractId, input.policy.version);
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
  return {
    transactionId,
    enterpriseId: input.tenant.id,
    actorId: input.actor.id,
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
    reasonCodes,
    previousTransactionId: input.previous?.transactionId ?? null,
    changedConditions,
    materialChange,
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
  return {
    transactionId: persisted.transactionId,
    correlationId: persisted.correlationId,
    enterpriseId: persisted.enterpriseId,
    actor: { id: context.actor.id, type: context.actor.type },
    trustObject: persisted.trustObject,
    action: { type: persisted.action.type, purpose: persisted.action.purpose, resource: persisted.action.resource, environment: persisted.action.environment, requestDigest: persisted.action.payloadDigest },
    decision: persisted.decision,
    trustState: persisted.trustState,
    evidence: persisted.evidence.map((item) => ({ reference: item.reference, providerId: item.providerId, providerEventId: item.providerEventId, sourceDigest: item.sourceDigest, outcome: item.outcome, observedAt: item.observedAt, expiresAt: item.expiresAt })),
    evidenceComplete: persisted.evidenceComplete,
    evidenceFresh: persisted.evidenceFresh,
    authorityReference: persisted.authorityReference,
    authorityLineageReferences: persisted.authorityEvidenceReferences,
    policy: { id: persisted.policy.id, version: persisted.policy.version, hash: persisted.policy.policyHash },
    decisionReference: persisted.decisionReference,
    evidenceGraphReference: input.evidenceGraphReference,
    replayReference: input.replayReference,
    trustMemoryReference: input.trustMemoryReference,
    materialChange: persisted.materialChange,
    changedConditions: persisted.changedConditions,
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
  const trustObject = await resolveTrustObject(dependencies, tenant, input);
  const requestedAt = input.requestedAt ?? new Date().toISOString();
  const evidence = await collectConfiguredEvidence(dependencies, tenant, trustObject, input);
  const providerEvidenceFresh = validateEvidenceFreshness(evidence, 86_400, requestedAt);
  const authority = await resolveAuthority(dependencies, tenant, trustObject);
  const evidenceFresh = providerEvidenceFresh && validateEvidenceFreshness(evidence, authority.maximumEvidenceAgeSeconds, requestedAt);
  const authorityScopeValid = validateAuthorityScope(authority, input, requestedAt);
  const policy = await resolvePolicyVersion(dependencies, tenant, authority, requestedAt);
  const previous = await dependencies.loadPreviousTransaction(tenant.id, input.previousTransactionId);
  const correlationId = crypto.randomUUID();
  const record = evaluateCanonicalTrustDecision({ tenant, actor, trustObject, authority, policy, evidence, evidenceFresh, authorityScopeValid, previous, transactionInput: input, requestedAt, correlationId });
  const context: TransactionContext = { input, actor, tenant, trustObject, authority, policy, evidence, evidenceFresh, authorityScopeValid, previous, record };
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
