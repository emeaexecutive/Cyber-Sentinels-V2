import "server-only";

import { createHmac } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  AuthenticatedTransactionActor,
  CanonicalDecisionRecord,
  CanonicalTrustTransactionDependencies,
  ExternalExecutionResult,
  PersistedCanonicalDecision,
  PreviousCanonicalTransaction,
  ResolvedPolicyVersion,
  SafeCanonicalTransactionReceipt,
  StoredProviderEvidence,
} from "@/src/lib/trust-transaction/canonical";
import type { EnterpriseSubjectClass, EnterpriseTrustObject, FabricTrustState, TrustContract } from "@/src/lib/trust-fabric/types";
import { createOperationalEntity, type OperationalEntity } from "@/lib/operational-entities/operational-entity";
import type { DecisionTimeSnapshot, ResponsibilityLineage } from "@/lib/operational-entities/federated-evidence";

type Row = Record<string, any>;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const externalReferencePattern = /^[a-zA-Z0-9_.:/-]{1,240}$/;

export class CanonicalTransactionError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "CanonicalTransactionError";
  }
}

function fail(operation: string, error: unknown): never {
  console.error("Canonical trust transaction failed safely.", { operation, code: (error as { code?: string })?.code ?? "UNKNOWN" });
  throw new CanonicalTransactionError(`${operation} failed safely.`, 503, "TRUST_TRANSACTION_PERSISTENCE_FAILED");
}

function state(value: unknown): FabricTrustState {
  return ["verified", "degraded", "contested", "suspended", "revoked"].includes(String(value)) ? String(value) as FabricTrustState : "degraded";
}

function tenantObject(row: Row, enterpriseId: string): EnterpriseTrustObject {
  const subjectType = String(row.subject_type) as EnterpriseSubjectClass;
  const subjectId = String(row.subject_id);
  const trustState = state(row.current_trust_state);
  const reference = row.evidence_graph_node_id ? { type: "evidence_graph_node", id: String(row.evidence_graph_node_id) } : null;
  return {
    enterpriseId,
    subjectType,
    subjectId,
    displayIdentity: String(row.display_label ?? subjectId),
    subject: { type: subjectType, id: subjectId, displayName: String(row.display_label ?? subjectId) },
    identityState: trustState,
    authorityState: trustState,
    environmentState: trustState,
    scopeState: trustState,
    evidenceCompleteness: ["complete", "partial", "insufficient", "unknown"].includes(String(row.evidence_completeness)) ? row.evidence_completeness : "unknown",
    trustState,
    providerState: "unknown",
    activeContradictions: [],
    activeIncidents: [],
    activeReviews: [],
    correctiveActions: [],
    trustDnaReference: null,
    continuousTrustReference: null,
    policyId: "resolved-from-trust-contract",
    canonicalDigest: "stored-projection",
    currentTrustState: trustState,
    trustDnaProfileReference: null,
    continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null,
    trustMemoryReference: null,
    evidenceGraphNodeReference: reference,
    lastEvaluatedAt: String(row.last_evaluated_at ?? new Date(0).toISOString()),
    policyVersion: "resolved-from-trust-contract",
    correlationId: String(row.current_state_decision_id ?? "00000000-0000-4000-8000-000000000000"),
  };
}

function safeEvidence(row: Row): StoredProviderEvidence {
  return {
    reference: String(row.evidence_id),
    type: String(row.evidence_type),
    providerId: String(row.provider_id),
    providerEventId: String(row.provider_event_id),
    providerSessionId: String(row.provider_session_id),
    outcome: String(row.outcome) as StoredProviderEvidence["outcome"],
    observedAt: String(row.observed_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    sourceDigest: String(row.source_digest),
    assuranceLevel: row.assurance_level === null ? null : Number(row.assurance_level),
    correlationId: String(row.correlation_id),
  };
}

function safeNativeEvidence(row: Row): StoredProviderEvidence {
  return {
    reference: String(row.evidence_id),
    type: "NATIVE_ENTITY_IDENTITY_PROOF",
    providerId: "cyber_sentinels_native",
    providerEventId: String(row.challenge_id),
    providerSessionId: String(row.verification_id),
    outcome: "PASSED",
    observedAt: String(row.verified_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    sourceDigest: String(row.evidence_digest),
    assuranceLevel: 0.95,
    correlationId: String(row.verification_id),
    sourcePartyId: "cyber_sentinels",
    sourceClassification: "technology_provider_asserted",
    schemaVersion: String(row.verification_algorithm_version ?? "native-entity-verification-v1"),
  };
}

function receiptFromRow(row: Row): SafeCanonicalTransactionReceipt {
  const evidence = Array.isArray(row.evidence_references) ? row.evidence_references : [];
  const authorityLineage = Array.isArray(row.authority_lineage_references) ? row.authority_lineage_references : [];
  const storedExternalState = String(row.external_state ?? "NOT_REQUESTED");
  const safeExternalOutcome = ["SUCCEEDED", "FAILED", "UNKNOWN", "NOT_REQUESTED", "NOT_CONFIGURED"].includes(storedExternalState)
    ? storedExternalState as SafeCanonicalTransactionReceipt["externalExecution"]["outcome"]
    : "UNKNOWN";
  const responsibilityLineage = (row.responsibility_lineage && typeof row.responsibility_lineage === "object"
    ? row.responsibility_lineage
    : {
        businessOwner: String(row.accountable_owner_id ?? "legacy_unresolved"),
        controlOwner: String(row.accountable_owner_id ?? "legacy_unresolved"),
        policyApprover: "legacy_unresolved",
        controlOperator: "legacy_unresolved",
        technologyProvider: "legacy_unresolved",
        identityAuthorizationProvider: "legacy_unresolved",
        operationalEntity: String(row.operational_entity_id ?? row.subject_id ?? "legacy_unresolved"),
        runtimeProvider: "legacy_unresolved",
        destinationSystem: String(row.action_resource ?? "legacy_unresolved"),
        evidenceProvider: "legacy_unresolved",
        independentConfirmationSource: null,
        reviewer: null,
      }) as ResponsibilityLineage;
  const decisionTimeSnapshot = (row.decision_time_snapshot && typeof row.decision_time_snapshot === "object"
    ? row.decision_time_snapshot
    : {
        snapshotVersion: "1.0",
        frozenAt: String(row.requested_at),
        operationalEntityVersion: "legacy_unresolved",
        externalIdentityReferences: [],
        accountableHuman: String(row.accountable_owner_id ?? "legacy_unresolved"),
        authorityLineageReferences: authorityLineage,
        responsibilityLineage,
        providerHealth: {},
        providerEvidence: [],
        evidenceIndependence: "insufficient",
        policyVersion: `${row.policy_id}:${row.policy_version}`,
        configurationRulesetDigest: String(row.policy_hash),
        enforcementState: { policyDecision: String(row.decision), controlOwnerApproval: null, operatorRequest: null, technologyProviderRequest: null, providerAcknowledgement: null, providerEnforcementClaim: null, runtimeObservation: null, destinationObservation: null, businessOutcome: null },
        contradictions: [],
        activeIncidentReferences: [],
        consequence: "unknown",
        confidenceInConclusion: "INSUFFICIENT",
        decisionDigest: "not_recorded",
        reviewerState: "legacy_unresolved",
      }) as DecisionTimeSnapshot;
  const evidenceReferences = evidence
    .map((item: Row) => ({ type: "normalized_provider_evidence", id: String(item.reference ?? "") }))
    .filter((item: { id: string }) => item.id);
  const authorityEvidenceReferences = authorityLineage
    .map((item: unknown) => item && typeof item === "object"
      ? { type: String((item as Row).type ?? "authority_evidence"), id: String((item as Row).id ?? "") }
      : { type: "authority_evidence", id: String(item ?? "") })
    .filter((item: { id: string }) => item.id);
  return {
    transactionId: String(row.transaction_id),
    correlationId: String(row.correlation_id),
    enterpriseId: String(row.enterprise_id),
    operationalEntityId: String(row.operational_entity_id ?? row.subject_id ?? "legacy_unresolved"),
    accountableOwnerId: String(row.accountable_owner_id ?? "legacy_unresolved"),
    entityType: String(row.entity_type ?? "other_governed_entity"),
    entityLifecycleState: String(row.entity_lifecycle_state ?? "unknown"),
    actor: { id: String(row.actor_id), type: String(row.actor_type) },
    trustObject: { subjectType: String(row.subject_type) as EnterpriseSubjectClass, subjectId: String(row.subject_id) },
    action: {
      type: String(row.action_type), purpose: String(row.action_purpose), resource: String(row.action_resource),
      environment: String(row.action_environment), requestDigest: String(row.request_digest),
    },
    decision: String(row.decision) as SafeCanonicalTransactionReceipt["decision"],
    trustState: String(row.trust_state) as SafeCanonicalTransactionReceipt["trustState"],
    reasonCodes: Array.isArray(row.reason_codes) ? row.reason_codes.map(String) : [],
    evidence,
    evidenceComplete: Boolean(row.evidence_complete),
    evidenceFresh: Boolean(row.evidence_fresh),
    evidenceReferences: [...evidenceReferences, ...authorityEvidenceReferences],
    authorityReference: String(row.authority_reference),
    authorityLineageReferences: authorityLineage,
    policy: { id: String(row.policy_id), version: String(row.policy_version), hash: String(row.policy_hash) },
    decisionReference: String(row.decision_id),
    evidenceGraphReference: String(row.evidence_graph_reference ?? ""),
    replayReference: String(row.replay_reference ?? ""),
    trustMemoryReference: row.trust_memory_reference ? String(row.trust_memory_reference) : null,
    materialChange: Boolean(row.material_change),
    changedConditions: Array.isArray(row.changed_conditions) ? row.changed_conditions.map(String) : [],
    responsibilityLineage,
    evidenceIndependence: (["single_source", "same_party_multi_system", "provider_and_operator_same_party", "multi_source", "independently_confirmed", "conflicting", "insufficient"].includes(String(row.evidence_independence)) ? String(row.evidence_independence) : "insufficient") as SafeCanonicalTransactionReceipt["evidenceIndependence"],
    decisionTimeSnapshot,
    consequence: decisionTimeSnapshot.consequence ?? "unknown",
    confidenceInConclusion: decisionTimeSnapshot.confidenceInConclusion ?? "INSUFFICIENT",
    timestamp: String(row.requested_at),
    digest: decisionTimeSnapshot.decisionDigest ?? "not_recorded",
    externalExecution: {
      requested: row.external_state !== "NOT_REQUESTED" && row.external_state !== "NOT_CONFIGURED",
      requestReference: row.external_request_reference ? String(row.external_request_reference) : null,
      acknowledgementReference: row.external_acknowledgement_reference ? String(row.external_acknowledgement_reference) : null,
      outcomeReference: row.external_outcome_reference ? String(row.external_outcome_reference) : null,
      outcome: safeExternalOutcome,
    },
    historyUrl: `/trust/transactions/${row.transaction_id}`,
    idempotentReplay: false,
  };
}

async function rpc(db: SupabaseClient, operation: string, name: string, args: Record<string, unknown>) {
  const result = await db.rpc(name, args);
  if (result.error || !result.data) fail(operation, result.error);
  return result.data as Row;
}

async function resolveSessionTenant(supabase: SupabaseClient, user: User) {
  const sessionTenant = String(user.app_metadata?.active_enterprise_id ?? "");
  if (uuidPattern.test(sessionTenant)) {
    const active = await supabase.from("trust_workspaces").select("id,name").eq("id", sessionTenant).maybeSingle();
    if (active.data) return { id: String(active.data.id), name: String(active.data.name ?? active.data.id) };
  }
  const owned = await supabase.from("trust_workspaces").select("id,name").eq("created_by", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (owned.error) fail("Session tenant resolution", owned.error);
  if (owned.data) return { id: String(owned.data.id), name: String(owned.data.name ?? owned.data.id) };
  const membership = await supabase.from("workspace_members").select("workspace_id,trust_workspaces(id,name)").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (membership.error) fail("Session tenant resolution", membership.error);
  const workspace = membership.data?.trust_workspaces as unknown as { id: string; name: string | null } | null;
  if (!workspace) throw new CanonicalTransactionError("The authenticated session has no enterprise tenant.", 403, "SESSION_TENANT_UNAVAILABLE");
  return { id: workspace.id, name: workspace.name ?? workspace.id };
}

function decisionPayload(record: CanonicalDecisionRecord) {
  return {
    transactionId: record.transactionId,
    enterpriseId: record.enterpriseId,
    actorId: record.actorId,
    operationalEntityId: record.operationalEntityId,
    accountableOwnerId: record.accountableOwnerId,
    entityType: record.entityType,
    entityLifecycleState: record.entityLifecycleState,
    actorType: "human",
    subjectType: record.trustObject.subjectType,
    subjectId: record.trustObject.subjectId,
    workflowId: record.workflowId,
    actionType: record.action.type,
    actionPurpose: record.action.purpose,
    actionResource: record.action.resource,
    actionEnvironment: record.action.environment,
    requestDigest: record.action.payloadDigest,
    idempotencyKey: record.idempotencyKey,
    correlationId: record.correlationId,
    requestedAt: record.requestedAt,
    decision: record.decision,
    trustState: record.trustState,
    decisionId: record.decisionReference,
    authorityReference: record.authorityReference,
    authorityLineageReferences: record.authorityEvidenceReferences,
    policyId: record.policy.id,
    policyVersion: record.policy.version,
    policyHash: record.policy.policyHash,
    evidenceReferences: record.evidence.map((item) => ({ reference: item.reference, providerId: item.providerId, providerEventId: item.providerEventId, sourceDigest: item.sourceDigest, outcome: item.outcome, observedAt: item.observedAt, expiresAt: item.expiresAt })),
    evidenceDigest: record.evidenceDigest,
    evidenceComplete: record.evidenceComplete,
    evidenceFresh: record.evidenceFresh,
    reasonCodes: record.reasonCodes,
    previousTransactionId: record.previousTransactionId,
    changedConditions: record.changedConditions,
    materialChange: record.materialChange,
    responsibilityLineage: record.responsibilityLineage,
    evidenceIndependence: record.evidenceIndependence,
    decisionTimeSnapshot: record.decisionTimeSnapshot,
  };
}

function configuredRelayUrl() {
  const raw = process.env.TRUST_ACTION_RELAY_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && process.env.NODE_ENV !== "production")) throw new CanonicalTransactionError("The external relay requires HTTPS.", 503, "EXTERNAL_RELAY_CONFIGURATION_INVALID");
  return parsed;
}

async function callExternalRelay(record: PersistedCanonicalDecision, requestReference: string): Promise<ExternalExecutionResult> {
  const url = configuredRelayUrl();
  const secret = process.env.TRUST_ACTION_RELAY_SECRET?.trim();
  if (!url || !secret) return { configured: false, requestReference, acknowledgement: null, outcome: null };
  const body = JSON.stringify({
    requestReference,
    transactionId: record.transactionId,
    correlationId: record.correlationId,
    subject: record.trustObject,
    action: record.action,
    authorityReference: record.authorityReference,
    policy: { id: record.policy.id, version: record.policy.version },
    evidenceDigest: record.evidenceDigest,
  });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": record.correlationId, "x-trust-signature": `sha256=${signature}`, "idempotency-key": record.idempotencyKey },
      body,
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const parsed = await response.json().catch(() => ({})) as Row;
    const externalReferenceCandidate = String(parsed.acknowledgementId ?? parsed.requestId ?? response.headers.get("x-external-request-id") ?? requestReference);
    const externalReference = externalReferencePattern.test(externalReferenceCandidate) ? externalReferenceCandidate : requestReference;
    const acknowledgement = { externalReference, acknowledgedAt: new Date().toISOString() };
    if (!response.ok) return { configured: true, requestReference, acknowledgement, outcome: { state: "FAILED", externalReference, occurredAt: new Date().toISOString(), reason: `Relay rejected the request with HTTP ${response.status}.` } };
    const explicitOutcome = ["SUCCEEDED", "FAILED", "UNKNOWN"].includes(String(parsed.outcome)) ? String(parsed.outcome) as "SUCCEEDED" | "FAILED" | "UNKNOWN" : null;
    return {
      configured: true,
      requestReference,
      acknowledgement,
      outcome: explicitOutcome ? { state: explicitOutcome, externalReference: externalReferencePattern.test(String(parsed.outcomeReference ?? "")) ? String(parsed.outcomeReference) : externalReference, occurredAt: String(parsed.outcomeAt ?? new Date().toISOString()), reason: String(parsed.outcomeReason ?? "The relay returned an explicit terminal outcome.").slice(0, 500) } : null,
    };
  } catch {
    return { configured: true, requestReference, acknowledgement: null, outcome: { state: "UNKNOWN", externalReference: null, occurredAt: new Date().toISOString(), reason: "The relay result is unknown after a transport failure or timeout." } };
  }
}

export function createCanonicalTrustTransactionDependencies(input: { supabase: SupabaseClient; user: User }): CanonicalTrustTransactionDependencies {
  const db = createServiceRoleClient();
  return {
    async authenticateActor() {
      const current = await input.supabase.auth.getUser();
      if (current.error || !current.data.user || current.data.user.id !== input.user.id) throw new CanonicalTransactionError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
      return { id: input.user.id, type: "human", authority: `authenticated-session:${input.user.id}` } satisfies AuthenticatedTransactionActor;
    },
    async resolveTenantFromSession() { return resolveSessionTenant(input.supabase, input.user); },
    async findByIdempotency(enterpriseId, idempotencyKey) {
      const result = await db.from("canonical_trust_transactions").select("*").eq("enterprise_id", enterpriseId).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (result.error) fail("Idempotency lookup", result.error);
      return result.data ? receiptFromRow(result.data) : null;
    },
    async loadTrustObject(enterpriseId, subjectType, subjectId) {
      const result = await db.from("enterprise_trust_objects").select("*").eq("enterprise_id", enterpriseId).eq("subject_type", subjectType).eq("subject_id", subjectId).maybeSingle();
      if (result.error) fail("Trust Object resolution", result.error);
      if (!result.data) throw new CanonicalTransactionError("The Trust Object is unknown in the session tenant.", 404, "TRUST_OBJECT_NOT_FOUND");
      return tenantObject(result.data, enterpriseId);
    },
    async resolveOperationalEntity(tenantId, input) {
      try {
        const result = await db.from("operational_entities").select("*").eq("enterprise_id", tenantId).eq("entity_id", input.requestedEntityId ?? input.trustObjectReference ?? "").maybeSingle();
        if (result.error) throw result.error;
        if (result.data) {
          const identities = await db.from("operational_entity_external_identities")
            .select("external_identity_id,provider,provider_entity_id,builder_platform,provider_native_lifecycle,provider_owner,provider_business_purpose,certification_state,permissions_summary,observed_at,source_timestamp,evidence_digest,corrected_by_reference_id,supersedes_reference_id")
            .eq("enterprise_id", tenantId)
            .eq("operational_entity_id", String(result.data.entity_id))
            .order("observed_at", { ascending: true });
          if (identities.error) throw identities.error;
          return {
            entityId: String(result.data.entity_id ?? input.requestedEntityId ?? input.trustObjectReference ?? "legacy_unresolved"),
            enterpriseId: String(result.data.enterprise_id ?? tenantId),
            entityType: String(result.data.entity_type ?? "other_governed_entity") as OperationalEntity["entityType"],
            displayReference: String(result.data.display_reference ?? result.data.entity_id ?? input.requestedEntityId ?? input.trustObjectReference ?? "legacy_unresolved"),
            canonicalTrustObjectId: String(result.data.canonical_trust_object_id ?? input.trustObjectReference ?? "legacy_unresolved"),
            lifecycleState: String(result.data.lifecycle_state ?? "unknown") as OperationalEntity["lifecycleState"],
            accountableOwnerId: String(result.data.accountable_owner_id ?? "legacy_unresolved"),
            organizationReference: String(result.data.organization_reference ?? "legacy_unresolved"),
            providerReferences: Array.isArray(result.data.provider_references) ? result.data.provider_references.map(String) : [],
            externalIdentityReferences: (identities.data ?? []).map((identity) => ({
              referenceId: String(identity.external_identity_id),
              provider: String(identity.provider),
              providerEntityId: String(identity.provider_entity_id),
              builderPlatform: String(identity.builder_platform),
              providerNativeLifecycle: String(identity.provider_native_lifecycle) as OperationalEntity["externalIdentityReferences"][number]["providerNativeLifecycle"],
              providerOwner: identity.provider_owner ? String(identity.provider_owner) : null,
              providerBusinessPurpose: identity.provider_business_purpose ? String(identity.provider_business_purpose) : null,
              certificationState: String(identity.certification_state),
              permissionsSummary: Array.isArray(identity.permissions_summary) ? identity.permissions_summary.map(String) : [],
              observedAt: String(identity.observed_at),
              sourceTimestamp: String(identity.source_timestamp),
              evidenceDigest: String(identity.evidence_digest),
              correctedByReferenceId: identity.corrected_by_reference_id ? String(identity.corrected_by_reference_id) : null,
              supersedesReferenceId: identity.supersedes_reference_id ? String(identity.supersedes_reference_id) : null,
            })),
            identityProfileReference: String(result.data.identity_profile_reference ?? input.requestedEntityId ?? input.trustObjectReference ?? "legacy_unresolved"),
            currentAuthorityReferences: Array.isArray(result.data.current_authority_references) ? result.data.current_authority_references.map(String) : [],
            environmentReferences: Array.isArray(result.data.environment_references) ? result.data.environment_references.map(String) : [],
            workflowReferences: Array.isArray(result.data.workflow_references) ? result.data.workflow_references.map(String) : [],
            currentTrustState: String(result.data.current_trust_state ?? "unknown"),
            currentEvidenceState: String(result.data.current_evidence_state ?? "unknown"),
            currentConsequenceClassification: String(result.data.current_consequence_classification ?? "unknown") as OperationalEntity["currentConsequenceClassification"],
            createdAt: String(result.data.created_at ?? new Date().toISOString()),
            updatedAt: String(result.data.updated_at ?? new Date().toISOString()),
            suspendedAt: result.data.suspended_at ? String(result.data.suspended_at) : null,
            revokedAt: result.data.revoked_at ? String(result.data.revoked_at) : null,
            supersedesEntityVersionId: result.data.supersedes_entity_version_id ? String(result.data.supersedes_entity_version_id) : null,
            canonicalDigest: String(result.data.canonical_digest ?? "legacy_unresolved"),
          } satisfies OperationalEntity;
        }
      } catch {
        // Fall back to a deterministic derived entity when the canonical storage table is unavailable.
      }
      return createOperationalEntity({
        entityId: input.requestedEntityId ?? input.trustObjectReference ?? "legacy_unresolved",
        enterpriseId: tenantId,
        entityType: "other_governed_entity",
        displayReference: input.requestedEntityId ?? input.trustObjectReference ?? "legacy_unresolved",
        canonicalTrustObjectId: input.trustObjectReference ?? input.requestedEntityId ?? "legacy_unresolved",
        lifecycleState: "unknown",
        accountableOwnerId: "legacy_unresolved",
        organizationReference: "legacy_unresolved",
        providerReferences: [],
        identityProfileReference: input.requestedEntityId ?? input.trustObjectReference ?? "legacy_unresolved",
        currentAuthorityReferences: [],
        environmentReferences: [],
        workflowReferences: [],
        currentTrustState: "unknown",
        currentEvidenceState: "unknown",
        currentConsequenceClassification: "unknown",
        canonicalDigest: "legacy_unresolved",
      });
    },
    async loadConfiguredEvidence({ enterpriseId, subjectId, operationalEntityId, providerExecutionId }) {
      const nativeResult = await db.from("native_entity_identity_evidence")
        .select("evidence_id,verification_id,challenge_id,verified_at,expires_at,evidence_digest,verification_algorithm_version")
        .eq("enterprise_id", enterpriseId)
        .eq("operational_entity_id", operationalEntityId ?? subjectId)
        .is("revoked_at", null)
        .order("verified_at", { ascending: false })
        .limit(20);
      if (nativeResult.error) fail("Native evidence collection", nativeResult.error);
      const nativeEvidence = (nativeResult.data ?? []).map(safeNativeEvidence);
      let workflowId: string | null = null;
      let providerSessionId: string | null = null;
      if (providerExecutionId) {
        const execution = await db.from("provider_execution_records").select("provider_id,provider_session_id,status,tenant_id,workflow_id").eq("execution_id", providerExecutionId).eq("tenant_id", enterpriseId).maybeSingle();
        if (execution.error) {
          if (nativeEvidence.length) return nativeEvidence;
          fail("Provider execution resolution", execution.error);
        }
        if (!execution.data || execution.data.status !== "completed" || execution.data.provider_id !== "hopae_connect") throw new CanonicalTransactionError("The configured provider execution is incomplete or outside the tenant.", 409, "PROVIDER_EVIDENCE_INCOMPLETE");
        providerSessionId = String(execution.data.provider_session_id ?? "");
        workflowId = String(execution.data.workflow_id ?? "");
        const verification = await db.from("hopae_verifications").select("verification_id").eq("workspace_id", enterpriseId).eq("workflow_id", workflowId).eq("verification_id", providerSessionId).eq("entity_id", subjectId).eq("provider_session_status", "COMPLETED").maybeSingle();
        if (verification.error) fail("Provider subject binding", verification.error);
        if (!verification.data) throw new CanonicalTransactionError("The configured provider execution is not bound to this Trust Object.", 409, "PROVIDER_EVIDENCE_SUBJECT_MISMATCH");
      } else {
        const verification = await db.from("hopae_verifications").select("workflow_id,verification_id").eq("workspace_id", enterpriseId).eq("entity_id", subjectId).eq("provider_session_status", "COMPLETED").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (verification.error) {
          if (nativeEvidence.length) return nativeEvidence;
          fail("Provider verification resolution", verification.error);
        }
        workflowId = verification.data?.workflow_id ? String(verification.data.workflow_id) : null;
        providerSessionId = verification.data?.verification_id ? String(verification.data.verification_id) : null;
      }
      if (!workflowId || !uuidPattern.test(workflowId)) return nativeEvidence;
      let query = db.from("normalized_identity_evidence").select("evidence_id,evidence_type,provider_id,provider_event_id,provider_session_id,outcome,observed_at,expires_at,source_digest,assurance_level,correlation_id").eq("tenant_id", enterpriseId).eq("trust_session_id", workflowId).order("observed_at", { ascending: false }).limit(20);
      if (providerSessionId) query = query.eq("provider_session_id", providerSessionId);
      const result = await query;
      if (result.error) {
        if (nativeEvidence.length) return nativeEvidence;
        fail("Configured evidence collection", result.error);
      }
      return [...nativeEvidence, ...(result.data ?? []).map(safeEvidence)].sort((left, right) => right.observedAt.localeCompare(left.observedAt));
    },
    async loadAuthority(enterpriseId, subjectType, subjectId) {
      const result = await db.from("trust_contracts").select("contract,revocation_state,revoked_at").eq("enterprise_id", enterpriseId).eq("subject_type", subjectType).eq("subject_id", subjectId).order("issued_at", { ascending: false }).limit(1).maybeSingle();
      if (result.error) fail("Authority resolution", result.error);
      if (!result.data?.contract) throw new CanonicalTransactionError("No Trust Contract exists for this Trust Object; the action is not authorized.", 409, "AUTHORITY_NOT_FOUND");
      return {
        ...(result.data.contract as TrustContract),
        revocationState: String(result.data.revocation_state ?? (result.data.contract as TrustContract).revocationState) as TrustContract["revocationState"],
        revokedAt: result.data.revoked_at ? String(result.data.revoked_at) : (result.data.contract as TrustContract).revokedAt,
      };
    },
    async loadPolicy(enterpriseId, policyId, policyVersion) {
      const result = await db.from("trust_policy_versions").select("policy_id,version,active,valid_from,valid_until,policy_hash").eq("enterprise_id", enterpriseId).eq("policy_id", policyId).eq("version", policyVersion).maybeSingle();
      if (result.error) fail("Policy version resolution", result.error);
      if (!result.data) throw new CanonicalTransactionError("The exact Trust Contract policy version is unavailable.", 409, "POLICY_VERSION_NOT_FOUND");
      return { id: String(result.data.policy_id), version: String(result.data.version), active: Boolean(result.data.active), validFrom: String(result.data.valid_from), validUntil: result.data.valid_until ? String(result.data.valid_until) : null, policyHash: String(result.data.policy_hash) } satisfies ResolvedPolicyVersion;
    },
    async loadPreviousTransaction(enterpriseId, transactionId) {
      if (!transactionId) return null;
      const result = await db.from("canonical_trust_transactions").select("transaction_id,enterprise_id,trust_state,decision,evidence_digest,authority_reference,policy_version").eq("enterprise_id", enterpriseId).eq("transaction_id", transactionId).maybeSingle();
      if (result.error) fail("Previous transaction resolution", result.error);
      if (!result.data) throw new CanonicalTransactionError("The previous transaction is unknown in this tenant.", 404, "PREVIOUS_TRANSACTION_NOT_FOUND");
      return { transactionId: String(result.data.transaction_id), enterpriseId: String(result.data.enterprise_id), trustState: String(result.data.trust_state), decision: String(result.data.decision), evidenceDigest: String(result.data.evidence_digest), authorityReference: String(result.data.authority_reference), policyVersion: String(result.data.policy_version) } as PreviousCanonicalTransaction;
    },
    async persistDecision(record) {
      const result = await rpc(db, "Decision persistence", "persist_canonical_trust_transaction_decision_v1", { p_transaction: decisionPayload(record), p_decision: record.decisionEnvelope });
      return { ...record, persistenceStatus: result.status === "DUPLICATE" ? "DUPLICATE" : "CREATED" };
    },
    async extendEvidenceGraph(record) {
      const result = await rpc(db, "Evidence Graph extension", "extend_canonical_trust_transaction_graph_v1", { p_enterprise_id: record.enterpriseId, p_transaction_id: record.transactionId, p_actor_id: record.actorId, p_correlation_id: record.correlationId });
      return String(result.evidenceGraphReference);
    },
    async appendReplay(record) {
      const result = await rpc(db, "Replay append", "append_canonical_trust_transaction_replay_v1", { p_enterprise_id: record.enterpriseId, p_transaction_id: record.transactionId, p_actor_id: record.actorId, p_correlation_id: record.correlationId });
      return String(result.replayReference);
    },
    async emitTrustMemory(record) {
      const result = await rpc(db, "Trust Memory write", "emit_canonical_trust_transaction_memory_v1", { p_enterprise_id: record.enterpriseId, p_transaction_id: record.transactionId, p_actor_id: record.actorId, p_correlation_id: record.correlationId });
      return String(result.trustMemoryReference);
    },
    async requestExternalExecution(record) {
      const request = await rpc(db, "External request persistence", "request_canonical_external_execution_v1", { p_enterprise_id: record.enterpriseId, p_transaction_id: record.transactionId, p_actor_id: record.actorId, p_correlation_id: record.correlationId, p_configured: Boolean(process.env.TRUST_ACTION_RELAY_URL?.trim() && process.env.TRUST_ACTION_RELAY_SECRET?.trim()) });
      return callExternalRelay(record, String(request.requestReference));
    },
    async recordExternalAcknowledgement(record, result) {
      const stored = await rpc(db, "External acknowledgement persistence", "record_canonical_external_acknowledgement_v1", { p_enterprise_id: record.enterpriseId, p_transaction_id: record.transactionId, p_actor_id: record.actorId, p_correlation_id: record.correlationId, p_external_reference: result.externalReference, p_acknowledged_at: result.acknowledgedAt });
      return String(stored.acknowledgementReference);
    },
    async recordExternalOutcome(record, result) {
      const stored = await rpc(db, "External outcome persistence", "record_canonical_external_outcome_v1", { p_enterprise_id: record.enterpriseId, p_transaction_id: record.transactionId, p_actor_id: record.actorId, p_correlation_id: record.correlationId, p_outcome: result.state, p_external_reference: result.externalReference, p_occurred_at: result.occurredAt, p_reason: result.reason });
      return String(stored.outcomeReference);
    },
  };
}

export async function loadCanonicalTrustTransactionHistory(input: { supabase: SupabaseClient; user: User; transactionId: string }) {
  if (!uuidPattern.test(input.transactionId)) throw new CanonicalTransactionError("Transaction reference is invalid.", 400, "INVALID_TRANSACTION_REFERENCE");
  const tenant = await resolveSessionTenant(input.supabase, input.user);
  const db = createServiceRoleClient();
  const [transaction, events, externalRequest, acknowledgements, outcomes, nativeRequests, nativeAcknowledgements, nativeClaims, nativeRuntime, nativeDestinations, nativeOutcomes, nativeContradictions] = await Promise.all([
    db.from("canonical_trust_transactions").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).maybeSingle(),
    db.from("canonical_trust_transaction_events").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("occurred_at", { ascending: true }),
    db.from("external_action_requests").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).maybeSingle(),
    db.from("external_action_acknowledgements").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("acknowledged_at", { ascending: true }),
    db.from("external_action_outcomes").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("occurred_at", { ascending: true }),
    db.from("native_enforcement_requests").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("requested_at", { ascending: true }),
    db.from("native_enforcement_acknowledgements").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("acknowledged_at", { ascending: true }),
    db.from("native_execution_claims").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("claimed_at", { ascending: true }),
    db.from("native_runtime_execution_observations").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("observed_at", { ascending: true }),
    db.from("native_destination_observations").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("observed_at", { ascending: true }),
    db.from("native_enforcement_outcomes").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("correlated_at", { ascending: true }),
    db.from("native_execution_contradictions").select("*").eq("enterprise_id", tenant.id).eq("transaction_id", input.transactionId).order("detected_at", { ascending: true }),
  ]);
  for (const result of [transaction, events, externalRequest, acknowledgements, outcomes, nativeRequests, nativeAcknowledgements, nativeClaims, nativeRuntime, nativeDestinations, nativeOutcomes, nativeContradictions]) if (result.error) fail("Transaction history read", result.error);
  if (!transaction.data) throw new CanonicalTransactionError("Transaction not found in the session tenant.", 404, "TRANSACTION_NOT_FOUND");
  return {
    tenant, receipt: receiptFromRow(transaction.data), transaction: transaction.data, events: events.data ?? [], externalRequest: externalRequest.data ?? null, acknowledgements: acknowledgements.data ?? [], outcomes: outcomes.data ?? [],
    nativeEnforcement: { requests: nativeRequests.data ?? [], acknowledgements: nativeAcknowledgements.data ?? [], executionClaims: nativeClaims.data ?? [], runtimeObservations: nativeRuntime.data ?? [], destinationObservations: nativeDestinations.data ?? [], outcomes: nativeOutcomes.data ?? [], contradictions: nativeContradictions.data ?? [] },
  };
}
