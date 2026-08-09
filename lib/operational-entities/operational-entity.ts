export type OperationalEntityType =
  | "human"
  | "ai_agent"
  | "service_account"
  | "service"
  | "api_client"
  | "application"
  | "model_endpoint"
  | "machine"
  | "device"
  | "workload"
  | "robot"
  | "supplier"
  | "contractor"
  | "organization"
  | "workflow"
  | "other_governed_entity";

export type OperationalEntityLifecycleState =
  | "discovered"
  | "enrolled"
  | "identity_pending"
  | "verified"
  | "partially_verified"
  | "active"
  | "degraded"
  | "contested"
  | "suspended"
  | "revoked"
  | "recovery_pending"
  | "restored"
  | "expired"
  | "retired"
  | "unknown";

export type OperationalConsequenceClassification =
  | "non_consequential"
  | "low"
  | "moderate"
  | "high"
  | "critical"
  | "unknown";

export type ExternalIdentityLifecycleState =
  | "active"
  | "inactive"
  | "suspended"
  | "deactivated"
  | "deleted"
  | "unknown";

/**
 * A provider-native identity is evidence about an Operational Entity. It is
 * deliberately not an authority grant and never establishes trust by itself.
 */
export type ExternalIdentityReference = {
  referenceId: string;
  provider: string;
  providerEntityId: string;
  builderPlatform: string;
  providerNativeLifecycle: ExternalIdentityLifecycleState;
  providerOwner: string | null;
  providerBusinessPurpose: string | null;
  certificationState: string;
  permissionsSummary: string[];
  observedAt: string;
  sourceTimestamp: string;
  evidenceDigest: string;
  correctedByReferenceId: string | null;
  supersedesReferenceId: string | null;
};

export type OperationalEntity = {
  entityId: string;
  enterpriseId: string;
  entityType: OperationalEntityType;
  displayReference: string;
  canonicalTrustObjectId: string;
  lifecycleState: OperationalEntityLifecycleState;
  accountableOwnerId: string;
  organizationReference: string;
  providerReferences: string[];
  externalIdentityReferences: ExternalIdentityReference[];
  identityProfileReference: string;
  currentAuthorityReferences: string[];
  environmentReferences: string[];
  workflowReferences: string[];
  currentTrustState: string;
  currentEvidenceState: string;
  currentConsequenceClassification: OperationalConsequenceClassification;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
  revokedAt: string | null;
  supersedesEntityVersionId: string | null;
  canonicalDigest: string;
};

export type OperationalActionEnvelope = {
  transactionId: string;
  enterpriseId: string;
  actorId: string;
  operationalEntityId: string;
  accountableOwnerId: string;
  actionType: string;
  objective: string;
  tool: string;
  target: string;
  resource: string;
  environment: string;
  dataBoundary: string;
  consequenceClassification: OperationalConsequenceClassification;
  authorityReference: string;
  policyReference: string;
  evidenceReferences: string[];
  requestedAt: string;
  idempotencyKey: string;
  correlationId: string;
};

export type OperationalConsequenceResult = {
  classification: OperationalConsequenceClassification;
  reasons: string[];
  dimensions: Record<string, string>;
};

export type OperationalTrustEvaluationResult = {
  decision: "ALLOW" | "REVIEW" | "DENY";
  reasons: string[];
};

export type OperationalEntityContinuityState =
  | "continuity_supported"
  | "continuity_partially_supported"
  | "approved_change"
  | "unexplained_change"
  | "provider_conflict"
  | "stale_evidence"
  | "continuity_unconfirmed"
  | "reviewer_required";

export type OperationalEntityResolutionInput = {
  requestedEntityId?: string | null;
  legacyHumanId?: string | null;
  agentId?: string | null;
  serviceIdentity?: string | null;
  deviceIdentity?: string | null;
  trustObjectReference?: string | null;
  tenantId: string;
  knownEntities: OperationalEntity[];
};

export class OperationalEntityResolutionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "OperationalEntityResolutionError";
  }
}

export function createOperationalEntity(input: Partial<OperationalEntity> & Pick<OperationalEntity, "entityId" | "enterpriseId" | "entityType" | "displayReference" | "canonicalTrustObjectId" | "lifecycleState" | "accountableOwnerId" | "organizationReference" | "providerReferences" | "identityProfileReference" | "currentAuthorityReferences" | "environmentReferences" | "workflowReferences" | "currentTrustState" | "currentEvidenceState" | "currentConsequenceClassification" | "canonicalDigest">): OperationalEntity {
  const now = new Date().toISOString();
  return {
    entityId: input.entityId,
    enterpriseId: input.enterpriseId,
    entityType: input.entityType,
    displayReference: input.displayReference,
    canonicalTrustObjectId: input.canonicalTrustObjectId,
    lifecycleState: input.lifecycleState,
    accountableOwnerId: input.accountableOwnerId,
    organizationReference: input.organizationReference,
    providerReferences: input.providerReferences ?? [],
    externalIdentityReferences: input.externalIdentityReferences ?? [],
    identityProfileReference: input.identityProfileReference,
    currentAuthorityReferences: input.currentAuthorityReferences ?? [],
    environmentReferences: input.environmentReferences ?? [],
    workflowReferences: input.workflowReferences ?? [],
    currentTrustState: input.currentTrustState,
    currentEvidenceState: input.currentEvidenceState,
    currentConsequenceClassification: input.currentConsequenceClassification,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    suspendedAt: input.suspendedAt ?? null,
    revokedAt: input.revokedAt ?? null,
    supersedesEntityVersionId: input.supersedesEntityVersionId ?? null,
    canonicalDigest: input.canonicalDigest,
  };
}

export function resolveOperationalEntity(input: OperationalEntityResolutionInput): OperationalEntity {
  const candidates = input.knownEntities.filter((entity) => entity.enterpriseId === input.tenantId);
  if (!candidates.length) {
    throw new OperationalEntityResolutionError("No governed operational entity is available for the requested tenant.", "ENTITY_NOT_FOUND");
  }

  const byIdentity = candidates.find((entity) => {
    const requested = input.requestedEntityId?.trim();
    const trustObject = input.trustObjectReference?.trim();
    return (
      (requested && entity.entityId === requested)
      || (trustObject && entity.canonicalTrustObjectId === trustObject)
      || (input.agentId && entity.identityProfileReference === input.agentId)
      || (input.serviceIdentity && entity.identityProfileReference === input.serviceIdentity)
      || (input.deviceIdentity && entity.identityProfileReference === input.deviceIdentity)
      || (input.legacyHumanId && entity.accountableOwnerId === input.legacyHumanId)
    );
  });

  const explicitReference = input.requestedEntityId?.trim() || input.trustObjectReference?.trim() || input.agentId?.trim() || input.serviceIdentity?.trim() || input.deviceIdentity?.trim();
  if (explicitReference && !byIdentity) {
    const existsOutsideTenant = input.knownEntities.some((entity) => entity.enterpriseId !== input.tenantId && (
      entity.entityId === explicitReference || entity.canonicalTrustObjectId === explicitReference || entity.identityProfileReference === explicitReference
    ));
    throw new OperationalEntityResolutionError(
      existsOutsideTenant ? "The operational entity is not visible in the evaluated tenant." : "The requested identity does not resolve to a governed operational entity.",
      existsOutsideTenant ? "ENTITY_ACCESS_DENIED" : "ENTITY_NOT_FOUND",
    );
  }

  const resolved = byIdentity ?? candidates[0];
  if (!resolved) {
    throw new OperationalEntityResolutionError("The requested identity does not resolve to a governed operational entity.", "ENTITY_NOT_FOUND");
  }
  if (resolved.enterpriseId !== input.tenantId) {
    throw new OperationalEntityResolutionError("The operational entity is not visible in the evaluated tenant.", "ENTITY_ACCESS_DENIED");
  }
  if (!resolved.currentAuthorityReferences.length) {
    throw new OperationalEntityResolutionError("The operational entity is not governed by an active authority lineage.", "ENTITY_NOT_GOVERNED");
  }
  if (resolved.lifecycleState === "revoked") {
    throw new OperationalEntityResolutionError("The operational entity has been revoked.", "ENTITY_REVOKED");
  }
  if (resolved.supersedesEntityVersionId) {
    throw new OperationalEntityResolutionError("The operational entity has been superseded by a newer version.", "ENTITY_SUPERSEDED");
  }
  return resolved;
}

export function createOperationalActionEnvelope(input: {
  entityId: string;
  actionType: string;
  objective: string;
  tool: string;
  target: string;
  resource: string;
  environment: string;
  dataBoundary: string;
  consequenceClassification: OperationalConsequenceClassification;
  authorityReference: string;
  policyReference: string;
  evidenceReferences: string[];
  requestContext: {
    enterpriseId: string;
    actorId: string;
    accountableOwnerId: string;
  };
}): OperationalActionEnvelope {
  const now = new Date().toISOString();
  return {
    transactionId: `tx:${input.entityId}:${now}`,
    enterpriseId: input.requestContext.enterpriseId,
    actorId: input.requestContext.actorId,
    operationalEntityId: input.entityId,
    accountableOwnerId: input.requestContext.accountableOwnerId,
    actionType: input.actionType,
    objective: input.objective,
    tool: input.tool,
    target: input.target,
    resource: input.resource,
    environment: input.environment,
    dataBoundary: input.dataBoundary,
    consequenceClassification: input.consequenceClassification,
    authorityReference: input.authorityReference,
    policyReference: input.policyReference,
    evidenceReferences: input.evidenceReferences,
    requestedAt: now,
    idempotencyKey: `idem:${input.entityId}:${now}`,
    correlationId: `corr:${input.entityId}:${now}`,
  };
}

export function classifyOperationalConsequence(input: {
  entity: OperationalEntity;
  requestedAction: string;
  target: string;
  tool: string;
  resource: string;
  environment: string;
  dataBoundary: string;
  authority: { scope?: string[] };
  policy: { requiresHumanApproval?: boolean };
  businessContext: string;
  incidentContext: string | null;
}): OperationalConsequenceResult {
  const reasons: string[] = [];
  const dimensions: Record<string, string> = {};
  const scope = input.authority.scope ?? [];

  if (input.incidentContext) {
    reasons.push("active incident context present");
    dimensions["operational continuity consequence"] = "high";
  }
  if (input.dataBoundary === "restricted") {
    reasons.push("restricted data boundary");
    dimensions["data consequence"] = "high";
  }
  if (input.environment === "production") {
    reasons.push("production environment");
    dimensions["infrastructure consequence"] = "high";
  }
  if (input.policy.requiresHumanApproval) {
    reasons.push("human approval required by policy");
    dimensions["regulatory consequence"] = "high";
  }
  if (!scope.includes(input.requestedAction)) {
    reasons.push("requested action outside delegated scope");
    dimensions["access consequence"] = "high";
  }

  const classification =
    dimensions["data consequence"] === "high" || dimensions["regulatory consequence"] === "high"
      ? "high"
      : dimensions["infrastructure consequence"] === "high"
        ? "moderate"
        : "low";

  return { classification, reasons, dimensions };
}

export function evaluateOperationalEntityTrust(input: {
  entity: OperationalEntity;
  actionEnvelope: OperationalActionEnvelope;
  authority: { isCurrent: boolean; isExpired: boolean; isRevoked: boolean; scope?: string[] };
  evidence: { isCurrent: boolean; isStale: boolean; hasProviderConflict: boolean };
  policy: { requiresHumanApproval?: boolean };
  incidentState: string | null;
}): OperationalTrustEvaluationResult {
  const reasons: string[] = [];

  if (input.entity.lifecycleState === "suspended") {
    reasons.push("entity suspended");
    return { decision: "DENY", reasons };
  }
  if (input.entity.lifecycleState === "revoked") {
    reasons.push("entity revoked");
    return { decision: "DENY", reasons };
  }
  // Registry presence is corroborating evidence only. The trust decision still
  // requires accountable ownership, authority, policy and current evidence.
  if (!input.entity.accountableOwnerId) {
    reasons.push("owner missing");
    return { decision: "DENY", reasons };
  }
  if (!input.authority.isCurrent) {
    reasons.push("authority missing");
    return { decision: "DENY", reasons };
  }
  if (input.authority.isExpired || input.authority.isRevoked) {
    reasons.push("authority expired or revoked");
    return { decision: "DENY", reasons };
  }
  if (!input.evidence.isCurrent || input.evidence.isStale) {
    reasons.push("evidence stale");
    return { decision: input.entity.currentConsequenceClassification === "high" ? "REVIEW" : "DENY", reasons };
  }
  if (input.evidence.hasProviderConflict) {
    reasons.push("provider conflict");
    return { decision: "REVIEW", reasons };
  }
  if (input.policy.requiresHumanApproval && input.entity.currentConsequenceClassification === "high") {
    reasons.push("human review required");
    return { decision: "REVIEW", reasons };
  }
  if (input.incidentState) {
    reasons.push("active incident");
    return { decision: "REVIEW", reasons };
  }

  return { decision: "ALLOW", reasons: ["entity verified and within authority scope"] };
}

export function evaluateOperationalEntityContinuity(input: {
  entity: OperationalEntity;
  previousEntity: OperationalEntity | null;
  providerEvidenceChanged: boolean;
  authorityChanged: boolean;
  ownerChanged: boolean;
  runtimeChanged: boolean;
  evidenceStale: boolean;
}): { state: OperationalEntityContinuityState; reasons: string[] } {
  if (!input.previousEntity) {
    return { state: "continuity_supported", reasons: ["no previous entity state available"] };
  }
  const reasons: string[] = [];

  if (input.providerEvidenceChanged) reasons.push("provider evidence changed");
  if (input.authorityChanged) reasons.push("authority changed");
  if (input.ownerChanged) reasons.push("owner changed");
  if (input.runtimeChanged) reasons.push("runtime changed");
  if (input.evidenceStale) reasons.push("evidence stale");

  if (reasons.length === 0) {
    return { state: "continuity_supported", reasons: ["entity continuity preserved"] };
  }

  if (input.providerEvidenceChanged && input.authorityChanged) {
    return { state: "unexplained_change", reasons };
  }
  if (input.evidenceStale) {
    return { state: "stale_evidence", reasons };
  }
  return { state: "approved_change", reasons };
}

export const operationalEntityFixtures: OperationalEntity[] = [
  createOperationalEntity({
    entityId: "entity:alpha",
    enterpriseId: "enterprise:acme",
    entityType: "ai_agent",
    displayReference: "Agent Alpha",
    canonicalTrustObjectId: "trust:alpha",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: ["provider:hopae"],
    externalIdentityReferences: [
      {
        referenceId: "external:identity-provider-a:agent-alpha:v1",
        provider: "Identity Provider A",
        providerEntityId: "agent-alpha-idp-a",
        builderPlatform: "enterprise-agent-platform",
        providerNativeLifecycle: "active",
        providerOwner: "owner:alice",
        providerBusinessPurpose: "Production deployment automation",
        certificationState: "certified",
        permissionsSummary: ["read:repository", "request:deployment"],
        observedAt: "2026-08-08T08:00:00.000Z",
        sourceTimestamp: "2026-08-08T07:59:30.000Z",
        evidenceDigest: "a".repeat(64),
        correctedByReferenceId: null,
        supersedesReferenceId: null,
      },
      {
        referenceId: "external:runtime:agent-alpha:v1",
        provider: "Runtime",
        providerEntityId: "runtime-agent-alpha",
        builderPlatform: "enterprise-agent-platform",
        providerNativeLifecycle: "active",
        providerOwner: "owner:alice",
        providerBusinessPurpose: "Production deployment automation",
        certificationState: "observed",
        permissionsSummary: ["invoke:deployment-tool"],
        observedAt: "2026-08-08T08:00:05.000Z",
        sourceTimestamp: "2026-08-08T08:00:04.000Z",
        evidenceDigest: "b".repeat(64),
        correctedByReferenceId: null,
        supersedesReferenceId: null,
      },
    ],
    identityProfileReference: "profile:alpha",
    currentAuthorityReferences: ["authority:alpha"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:deploy"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "low",
    canonicalDigest: "digest:alpha",
  }),
  createOperationalEntity({
    entityId: "entity:beta",
    enterpriseId: "enterprise:acme",
    entityType: "service_account",
    displayReference: "Service Beta",
    canonicalTrustObjectId: "trust:beta",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: ["provider:secrets"],
    identityProfileReference: "profile:beta",
    currentAuthorityReferences: ["authority:beta"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:repo"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "moderate",
    canonicalDigest: "digest:beta",
  }),
  createOperationalEntity({
    entityId: "entity:gamma",
    enterpriseId: "enterprise:acme",
    entityType: "device",
    displayReference: "Device Gamma",
    canonicalTrustObjectId: "trust:gamma",
    lifecycleState: "degraded",
    accountableOwnerId: "owner:bob",
    organizationReference: "org:acme",
    providerReferences: ["provider:attestation"],
    identityProfileReference: "profile:gamma",
    currentAuthorityReferences: ["authority:gamma"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:attestation"],
    currentTrustState: "degraded",
    currentEvidenceState: "stale",
    currentConsequenceClassification: "high",
    canonicalDigest: "digest:gamma",
  }),
];
