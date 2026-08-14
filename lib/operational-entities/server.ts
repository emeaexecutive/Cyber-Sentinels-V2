import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureCustomerWorkspace } from "@/lib/onboarding/customer-workspace";
import { createOperationalEntity, type ExternalIdentityReference, type OperationalEntity } from "./operational-entity";

type Row = Record<string, unknown>;

export type OperationalEntityLiveDetail = {
  entity: OperationalEntity;
  externalIdentities: ExternalIdentityReference[];
  providerRelationships: Row[];
  providerTransitions: Row[];
  providerChangeEvents: Row[];
  transactions: Row[];
  enforcementEvents: Row[];
  replay: Row[];
  trustMemory: Row[];
  evidenceGraph: { nodes: Row[]; edges: Row[] };
  nativeVerification: {
    manifests: Row[];
    credentials: Row[];
    verifications: Row[];
    evidence: Row[];
    replay: Row[];
    ownerBindings: Row[];
  };
  delegatedAuthority: {
    delegated: Row[];
    received: Row[];
    acceptances: Row[];
    evaluations: Row[];
  };
  nativeEnforcement: {
    requests: Row[];
    acknowledgements: Row[];
    executionClaims: Row[];
    runtimeObservations: Row[];
    destinationObservations: Row[];
    outcomes: Row[];
    contradictions: Row[];
  };
};

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function externalIdentity(row: Row): ExternalIdentityReference {
  return {
    referenceId: String(row.external_identity_id),
    provider: String(row.provider),
    providerEntityId: String(row.provider_entity_id),
    builderPlatform: String(row.builder_platform),
    providerNativeLifecycle: String(row.provider_native_lifecycle) as ExternalIdentityReference["providerNativeLifecycle"],
    providerOwner: row.provider_owner ? String(row.provider_owner) : null,
    providerBusinessPurpose: row.provider_business_purpose ? String(row.provider_business_purpose) : null,
    certificationState: String(row.certification_state),
    permissionsSummary: strings(row.permissions_summary),
    observedAt: String(row.observed_at),
    sourceTimestamp: String(row.source_timestamp),
    evidenceDigest: String(row.evidence_digest),
    correctedByReferenceId: row.corrected_by_reference_id ? String(row.corrected_by_reference_id) : null,
    supersedesReferenceId: row.supersedes_reference_id ? String(row.supersedes_reference_id) : null,
  };
}

export async function resolveOperationalEntityTenantId(supabase: SupabaseClient, user: User) {
  const workspace = await ensureCustomerWorkspace({ supabase, user });
  return workspace.workspaceId;
}

export async function loadOperationalEntities(input: { supabase: SupabaseClient; user: User }): Promise<OperationalEntity[]> {
  const enterpriseId = await resolveOperationalEntityTenantId(input.supabase, input.user);
  const [entities, identities] = await Promise.all([
    input.supabase.from("operational_entities").select("*").eq("enterprise_id", enterpriseId).order("updated_at", { ascending: false }),
    input.supabase.from("operational_entity_external_identities").select("*").eq("enterprise_id", enterpriseId).order("observed_at", { ascending: true }),
  ]);
  if (entities.error) throw entities.error;
  if (identities.error) throw identities.error;
  const identityRows = (identities.data ?? []) as Row[];
  return ((entities.data ?? []) as Row[]).map((row) => createOperationalEntity({
    entityId: String(row.entity_id),
    enterpriseId,
    entityType: String(row.entity_type) as OperationalEntity["entityType"],
    displayReference: String(row.display_reference),
    canonicalTrustObjectId: String(row.canonical_trust_object_id),
    lifecycleState: String(row.lifecycle_state) as OperationalEntity["lifecycleState"],
    accountableOwnerId: String(row.accountable_owner_id),
    organizationReference: String(row.organization_reference),
    providerReferences: strings(row.provider_references),
    externalIdentityReferences: identityRows.filter((identityRow) => String(identityRow.operational_entity_id) === String(row.entity_id)).map(externalIdentity),
    identityProfileReference: String(row.identity_profile_reference),
    currentAuthorityReferences: strings(row.current_authority_references),
    environmentReferences: strings(row.environment_references),
    workflowReferences: strings(row.workflow_references),
    currentTrustState: String(row.current_trust_state),
    currentEvidenceState: String(row.current_evidence_state),
    currentConsequenceClassification: String(row.current_consequence_classification) as OperationalEntity["currentConsequenceClassification"],
    suspendedAt: row.suspended_at ? String(row.suspended_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    supersedesEntityVersionId: row.supersedes_entity_version_id ? String(row.supersedes_entity_version_id) : null,
    canonicalDigest: String(row.canonical_digest),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function loadOperationalEntityDetail(input: {
  supabase: SupabaseClient;
  user: User;
  entityId: string;
}): Promise<OperationalEntityLiveDetail | null> {
  const enterpriseId = await resolveOperationalEntityTenantId(input.supabase, input.user);
  const entities = await loadOperationalEntities(input);
  const entity = entities.find((candidate) => candidate.entityId === input.entityId);
  if (!entity) return null;

  const [relationships, transitions, changes, transactions, memory, graphNodes, graphEdges, nativeManifests, nativeCredentials, nativeVerifications, nativeEvidence, nativeReplay, ownerBindings, delegated, received] = await Promise.all([
    input.supabase.from("provider_relationships").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("effective_from", { ascending: true }),
    input.supabase.from("provider_transitions").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("initiated_at", { ascending: true }),
    input.supabase.from("provider_change_events").select("*").eq("enterprise_id", enterpriseId).contains("affected_operational_entity_ids", [input.entityId]).order("occurred_at", { ascending: true }),
    input.supabase.from("canonical_trust_transactions").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("requested_at", { ascending: true }),
    input.supabase.from("trust_memory_index").select("*").eq("enterprise_id", enterpriseId).eq("subject_id", input.entityId).order("occurred_at", { ascending: true }),
    input.supabase.from("evidence_graph_nodes").select("*").eq("enterprise_id", enterpriseId).order("created_at", { ascending: true }).limit(500),
    input.supabase.from("evidence_graph_edges").select("*").eq("enterprise_id", enterpriseId).order("created_at", { ascending: true }).limit(1000),
    input.supabase.from("operational_entity_manifests").select("manifest_id,manifest_version,manifest_digest,signing_key_id,status,issued_at,expires_at,supersedes_manifest_id").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("issued_at", { ascending: false }).limit(20),
    input.supabase.from("operational_entity_native_credentials").select("credential_id,signing_key_id,algorithm,credential_fingerprint,state,valid_from,expires_at,revoked_at,rotated_from_credential_id").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("valid_from", { ascending: false }).limit(20),
    input.supabase.from("operational_entity_native_verifications").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("verified_at", { ascending: false }).limit(20),
    input.supabase.from("native_entity_identity_evidence").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("verified_at", { ascending: false }).limit(50),
    input.supabase.from("operational_entity_native_replay_events").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("occurred_at", { ascending: true }).limit(200),
    input.supabase.from("operational_entity_owner_bindings").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).order("effective_from", { ascending: false }).limit(20),
    input.supabase.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", enterpriseId).eq("delegator_operational_entity_id", input.entityId).order("issued_at", { ascending: false }).limit(100),
    input.supabase.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", enterpriseId).eq("delegate_operational_entity_id", input.entityId).order("issued_at", { ascending: false }).limit(100),
  ]);
  for (const result of [relationships, transitions, changes, transactions, memory, graphNodes, graphEdges, nativeManifests, nativeCredentials, nativeVerifications, nativeEvidence, nativeReplay, ownerBindings, delegated, received]) if (result.error) throw result.error;

  const delegationIds = [...new Set([...(delegated.data ?? []), ...(received.data ?? [])].map((row) => String(row.delegation_id)))];
  const [acceptances, delegatedEvaluations] = delegationIds.length
    ? await Promise.all([
        input.supabase.from("operational_entity_delegation_acceptances").select("*").eq("enterprise_id", enterpriseId).in("delegation_id", delegationIds),
        input.supabase.from("operational_entity_delegated_action_evaluations").select("*").eq("enterprise_id", enterpriseId).in("delegation_id", delegationIds).order("evaluated_at", { ascending: false }).limit(100),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (acceptances.error) throw acceptances.error;
  if (delegatedEvaluations.error) throw delegatedEvaluations.error;

  const transactionRows = (transactions.data ?? []) as Row[];
  const transactionIds = transactionRows.map((row) => String(row.transaction_id));
  const [enforcement, replay] = transactionIds.length
    ? await Promise.all([
        input.supabase.from("canonical_enforcement_events").select("*").eq("enterprise_id", enterpriseId).in("transaction_id", transactionIds).order("occurred_at", { ascending: true }),
        input.supabase.from("trust_replay_sessions").select("*").eq("workspace_id", enterpriseId).in("canonical_transaction_id", transactionIds).order("created_at", { ascending: true }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (enforcement.error) throw enforcement.error;
  if (replay.error) throw replay.error;
  const [nativeRequests, nativeAcknowledgements, nativeClaims, nativeRuntime, nativeDestinations, nativeOutcomes, nativeContradictions] = transactionIds.length
    ? await Promise.all([
        input.supabase.from("native_enforcement_requests").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).in("transaction_id", transactionIds).order("requested_at", { ascending: true }),
        input.supabase.from("native_enforcement_acknowledgements").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).in("transaction_id", transactionIds).order("acknowledged_at", { ascending: true }),
        input.supabase.from("native_execution_claims").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).in("transaction_id", transactionIds).order("claimed_at", { ascending: true }),
        input.supabase.from("native_runtime_execution_observations").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).in("transaction_id", transactionIds).order("observed_at", { ascending: true }),
        input.supabase.from("native_destination_observations").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).in("transaction_id", transactionIds).order("observed_at", { ascending: true }),
        input.supabase.from("native_enforcement_outcomes").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", input.entityId).in("transaction_id", transactionIds).order("correlated_at", { ascending: true }),
        input.supabase.from("native_execution_contradictions").select("*").eq("enterprise_id", enterpriseId).in("transaction_id", transactionIds).order("detected_at", { ascending: true }),
      ])
    : Array.from({ length: 7 }, () => ({ data: [], error: null }));
  for (const result of [nativeRequests, nativeAcknowledgements, nativeClaims, nativeRuntime, nativeDestinations, nativeOutcomes, nativeContradictions]) if (result.error) throw result.error;

  return {
    entity,
    externalIdentities: [...entity.externalIdentityReferences],
    providerRelationships: (relationships.data ?? []) as Row[],
    providerTransitions: (transitions.data ?? []) as Row[],
    providerChangeEvents: (changes.data ?? []) as Row[],
    transactions: transactionRows,
    enforcementEvents: (enforcement.data ?? []) as Row[],
    replay: (replay.data ?? []) as Row[],
    trustMemory: (memory.data ?? []) as Row[],
    evidenceGraph: { nodes: (graphNodes.data ?? []) as Row[], edges: (graphEdges.data ?? []) as Row[] },
    nativeVerification: {
      manifests: (nativeManifests.data ?? []) as Row[],
      credentials: (nativeCredentials.data ?? []) as Row[],
      verifications: (nativeVerifications.data ?? []) as Row[],
      evidence: (nativeEvidence.data ?? []) as Row[],
      replay: (nativeReplay.data ?? []) as Row[],
      ownerBindings: (ownerBindings.data ?? []) as Row[],
    },
    delegatedAuthority: {
      delegated: (delegated.data ?? []) as Row[],
      received: (received.data ?? []) as Row[],
      acceptances: (acceptances.data ?? []) as Row[],
      evaluations: (delegatedEvaluations.data ?? []) as Row[],
    },
    nativeEnforcement: {
      requests: (nativeRequests.data ?? []) as Row[],
      acknowledgements: (nativeAcknowledgements.data ?? []) as Row[],
      executionClaims: (nativeClaims.data ?? []) as Row[],
      runtimeObservations: (nativeRuntime.data ?? []) as Row[],
      destinationObservations: (nativeDestinations.data ?? []) as Row[],
      outcomes: (nativeOutcomes.data ?? []) as Row[],
      contradictions: (nativeContradictions.data ?? []) as Row[],
    },
  };
}
