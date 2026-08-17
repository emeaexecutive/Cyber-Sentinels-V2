import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createCanonicalTrustTransactionDependencies } from "@/lib/trust-transaction/server";
import { executeCanonicalTrustTransaction } from "@/src/lib/trust-transaction/canonical";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import type { TrustContract } from "@/src/lib/trust-fabric/types";
import {
  evaluateCapabilityGovernance,
  type CapabilityGovernanceEvaluation,
  type ModelGovernanceProjection,
} from "./capability-governance";
import {
  evaluateInterAgentAuthorityConflict,
  type AgentAuthorityEnvelope,
  type AgentRelationshipEvidence,
  type InterAgentConflictEvaluation,
} from "./inter-agent-authority-conflict";
import { classifyOperationalConsequence, type OperationalEntity } from "./operational-entity";
import {
  calculateDelegationBlastRadius,
  evaluateDelegatedAction,
  evaluateDelegationPolicy,
  validateDelegatedAuthoritySubset,
  verifyDelegationAcceptance,
  verifySignedDelegation,
  type AuthorityDelegation,
  type DelegationAcceptance,
  type NativeIdentityState,
  type ParentAuthority,
} from "./delegated-authority";
import type { NativeCredential, PublicJwk } from "./native-verification";

type Row = Record<string, any>;
type EnterpriseRole = "owner" | "admin" | "reviewer" | "observer";
export type DelegatedAuthorityContext = { enterpriseId: string; user: User; role: EnterpriseRole; supabase?: any };

export class DelegatedAuthorityServerError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message);
    this.name = "DelegatedAuthorityServerError";
  }
}

function ensureRole(role: EnterpriseRole, allowed: EnterpriseRole[]) {
  if (!allowed.includes(role)) throw new DelegatedAuthorityServerError("This enterprise role cannot perform the delegated-authority action.", "ENTERPRISE_ROLE_DENIED", 403);
}

function fail(operation: string, error: unknown): never {
  console.error(`${operation} failed.`, { code: (error as { code?: string })?.code });
  throw new DelegatedAuthorityServerError(`${operation} failed safely.`, "DELEGATED_AUTHORITY_PERSISTENCE_FAILED", 503);
}

function uuid(value: unknown, field: string) {
  const result = String(value ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw new DelegatedAuthorityServerError(`${field} is invalid.`, "DELEGATION_INPUT_INVALID");
  return result;
}

function reference(value: unknown, field: string) {
  const result = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_.:/-]{1,240}$/.test(result)) throw new DelegatedAuthorityServerError(`${field} is invalid.`, "OPERATIONAL_ENTITY_INPUT_INVALID");
  return result;
}

function rowCredential(row: Row): NativeCredential {
  return {
    credentialId: String(row.credential_id), enterpriseId: String(row.enterprise_id), operationalEntityId: String(row.operational_entity_id),
    signingKeyId: String(row.signing_key_id), algorithm: "Ed25519", publicJwk: row.public_jwk as PublicJwk,
    credentialFingerprint: String(row.credential_fingerprint), state: String(row.state) as NativeCredential["state"],
    validFrom: String(row.valid_from), expiresAt: row.expires_at ? String(row.expires_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null, rotatedFromCredentialId: row.rotated_from_credential_id ? String(row.rotated_from_credential_id) : null,
  };
}

function rowDelegation(row: Row): AuthorityDelegation {
  return {
    delegationId: String(row.delegation_id), enterpriseId: String(row.enterprise_id), delegatorOperationalEntityId: String(row.delegator_operational_entity_id),
    delegateOperationalEntityId: String(row.delegate_operational_entity_id), parentAuthorityId: String(row.parent_authority_id),
    parentDelegationId: row.parent_delegation_id ? String(row.parent_delegation_id) : null, objective: String(row.objective),
    scope: { permittedActions: row.permitted_actions?.map(String) ?? [], permittedTools: row.permitted_tools?.map(String) ?? [], permittedTargets: row.permitted_targets?.map(String) ?? [], environments: row.environments?.map(String) ?? [], dataBoundary: String(row.data_boundary) as AuthorityDelegation["scope"]["dataBoundary"], financialLimit: row.financial_limit === null ? null : Number(row.financial_limit), executionLimit: row.execution_limit === null ? null : Number(row.execution_limit) },
    canRedelegate: Boolean(row.can_redelegate), maximumDelegationDepth: Number(row.maximum_delegation_depth), depth: Number(row.delegation_depth),
    issuedAt: String(row.issued_at), notBefore: String(row.not_before), expiresAt: String(row.expires_at), revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    policyVersion: String(row.policy_version), authorityVersion: String(row.authority_version), nonce: String(row.nonce), signingKeyId: String(row.signing_key_id),
    delegationDigest: String(row.delegation_digest), signature: String(row.signature), status: String(row.status) as AuthorityDelegation["status"], evidenceReferences: row.evidence_references?.map(String) ?? [],
  };
}

function rowAcceptance(row: Row): DelegationAcceptance {
  return {
    acceptanceId: String(row.acceptance_id), enterpriseId: String(row.enterprise_id), delegationId: String(row.delegation_id), delegationDigest: String(row.delegation_digest),
    delegateOperationalEntityId: String(row.delegate_operational_entity_id), credentialFingerprint: String(row.credential_fingerprint), manifestDigest: String(row.manifest_digest),
    signingKeyId: String(row.signing_key_id), acceptedAt: String(row.accepted_at), nonce: String(row.nonce), signature: String(row.signature), acceptanceDigest: String(row.acceptance_digest),
  };
}

async function currentIdentity(enterpriseId: string, operationalEntityId: string): Promise<{ identity: NativeIdentityState; credential: NativeCredential; manifestId: string }> {
  const db = createServiceRoleClient();
  const verification = await db.from("operational_entity_native_verifications").select("*").eq("enterprise_id", enterpriseId).eq("operational_entity_id", operationalEntityId).order("verified_at", { ascending: false }).limit(1).maybeSingle();
  if (verification.error) fail("Native identity resolution", verification.error);
  if (!verification.data) throw new DelegatedAuthorityServerError("Current native identity evidence is required.", "IDENTITY_PROOF_FAILED", 409);
  const [credential, owner, evidence] = await Promise.all([
    db.from("operational_entity_native_credentials").select("*").eq("enterprise_id", enterpriseId).eq("credential_id", verification.data.credential_id).maybeSingle(),
    db.from("operational_entity_owner_bindings").select("state,accountable_owner_id").eq("enterprise_id", enterpriseId).eq("operational_entity_id", operationalEntityId).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    db.from("native_entity_identity_evidence").select("evidence_id,revoked_at").eq("enterprise_id", enterpriseId).eq("verification_id", verification.data.verification_id).maybeSingle(),
  ]);
  for (const result of [credential, owner, evidence]) if (result.error) fail("Native identity binding resolution", result.error);
  if (!credential.data || evidence.data?.revoked_at) throw new DelegatedAuthorityServerError("The native identity credential is unavailable or revoked.", "IDENTITY_PROOF_FAILED", 409);
  return {
    credential: rowCredential(credential.data),
    manifestId: String(verification.data.manifest_id),
    identity: {
      operationalEntityId, enterpriseId, status: String(verification.data.status) as NativeIdentityState["status"], ownerState: String(owner.data?.state ?? "UNKNOWN"), accountableOwnerId: String(owner.data?.accountable_owner_id ?? "UNKNOWN"),
      runtimeBinding: String(verification.data.runtime_binding), manifestDigest: String(verification.data.manifest_digest), credentialFingerprint: String(verification.data.credential_fingerprint),
      continuityFingerprint: String(verification.data.continuity_fingerprint),
      evidenceReference: `native_identity_evidence:${String(evidence.data?.evidence_id ?? verification.data.verification_id)}`, expiresAt: String(verification.data.expires_at),
    },
  };
}

function parentAuthorityFrom(contractRow: Row, operationalEntityId: string, accountableOwnerId: string): ParentAuthority {
  const contract = contractRow.contract as TrustContract;
  const configured: Partial<ParentAuthority["scope"]> = contract.authorityScope ?? {};
  return {
    authorityId: String(contractRow.contract_id), enterpriseId: String(contractRow.enterprise_id), operationalEntityId, accountableOwnerId,
    objective: String(contract.authorizedObjective),
    scope: {
      permittedActions: configured.permittedActions ?? contract.permittedScope,
      permittedTools: configured.permittedTools ?? contract.permittedScope,
      permittedTargets: configured.permittedTargets ?? [],
      environments: configured.environments ?? [],
      dataBoundary: configured.dataBoundary ?? "PUBLIC",
      financialLimit: configured.financialLimit ?? null,
      executionLimit: configured.executionLimit ?? null,
    },
    canDelegate: contract.canDelegate === true, maximumDelegationDepth: Number(contract.maximumDelegationDepth ?? 0), issuedAt: String(contract.issuedAt), notBefore: String(contract.issuedAt), expiresAt: String(contract.expiresAt),
    revokedAt: contractRow.revocation_state === "revoked" ? String(contractRow.revoked_at ?? new Date().toISOString()) : null,
    policyVersion: String(contract.policyVersion), authorityVersion: String(contract.authorityVersion ?? contract.policyVersion), evidenceReferences: contract.evidenceReferences.map((item) => `${item.type}:${item.id}`),
  };
}

async function parentAuthorityFor(enterpriseId: string, authorityId: string, expectedDelegatorId?: string) {
  const db = createServiceRoleClient();
  let contractQuery = db.from("trust_contracts").select("*").eq("enterprise_id", enterpriseId).eq("contract_id", authorityId);
  if (expectedDelegatorId) contractQuery = contractQuery.eq("subject_id", expectedDelegatorId);
  const contract = await contractQuery.maybeSingle();
  const rootEntityId = String(contract.data?.subject_id ?? "");
  const entity = rootEntityId ? await db.from("operational_entities").select("accountable_owner_id").eq("enterprise_id", enterpriseId).eq("entity_id", rootEntityId).maybeSingle() : { data: null, error: null };
  if (contract.error || entity.error) fail("Parent authority resolution", contract.error ?? entity.error);
  if (!contract.data || !entity.data) throw new DelegatedAuthorityServerError("The parent authority is not bound to this delegator and tenant.", "PARENT_AUTHORITY_NOT_FOUND", 404);
  return { parent: parentAuthorityFrom(contract.data, rootEntityId, String(entity.data.accountable_owner_id)), contract: contract.data as Row };
}

async function appendReplay(context: DelegatedAuthorityContext, entityId: string, eventType: string, reasonCodes: string[], payload: Record<string, unknown>, evidenceReferences: string[] = []) {
  const db = createServiceRoleClient();
  const occurredAt = new Date().toISOString();
  const base = { event_id: crypto.randomUUID(), enterprise_id: context.enterpriseId, operational_entity_id: entityId, event_type: eventType, actor_reference: `user:${context.user.id}`, attribution: "CYBER_SENTINELS_INTERPRETATION", evidence_references: evidenceReferences, reason_codes: reasonCodes, payload, occurred_at: occurredAt };
  const inserted = await db.from("operational_entity_native_replay_events").insert({ ...base, event_digest: hashCanonical(base) });
  if (inserted.error) fail("Delegated authority Replay append", inserted.error);
}

async function remember(context: DelegatedAuthorityContext, subjectId: string, memoryType: string, sourceId: string, summary: Record<string, unknown>) {
  const db = createServiceRoleClient();
  const result = await db.from("trust_memory_index").insert({ enterprise_id: context.enterpriseId, subject_id: subjectId, domain_key: "AUTHORITY", memory_type: memoryType, source_id: sourceId, occurred_at: new Date().toISOString(), summary });
  if (result.error && result.error.code !== "23505") fail("Delegated authority Trust Memory", result.error);
}

async function extendGraph(context: DelegatedAuthorityContext, delegation: AuthorityDelegation, edgeType: string) {
  const db = createServiceRoleClient();
  const nodes = [
    { node_type: "OPERATIONAL_ENTITY", external_id: delegation.delegatorOperationalEntityId, label: delegation.delegatorOperationalEntityId },
    { node_type: "OPERATIONAL_ENTITY", external_id: delegation.delegateOperationalEntityId, label: delegation.delegateOperationalEntityId },
    { node_type: "AUTHORITY_DELEGATION", external_id: delegation.delegationId, label: delegation.objective },
    { node_type: "TRUST_CONTRACT", external_id: delegation.parentAuthorityId, label: delegation.parentAuthorityId },
  ];
  const insertedNodes = await db.from("evidence_graph_nodes").upsert(nodes.map((node) => ({ ...node, enterprise_id: context.enterpriseId, domain_key: "AUTHORITY", metadata: {} })), { onConflict: "enterprise_id,node_type,external_id", ignoreDuplicates: true });
  if (insertedNodes.error) fail("Delegation Evidence Graph nodes", insertedNodes.error);
  const resolvedNodes = await db.from("evidence_graph_nodes").select("node_id,node_type,external_id").eq("enterprise_id", context.enterpriseId).in("external_id", nodes.map((node) => node.external_id));
  if (resolvedNodes.error) fail("Delegation Evidence Graph resolution", resolvedNodes.error);
  const by = new Map((resolvedNodes.data ?? []).map((node) => [`${node.node_type}:${node.external_id}`, String(node.node_id)]));
  const delegationNode = by.get(`AUTHORITY_DELEGATION:${delegation.delegationId}`);
  const delegatorNode = by.get(`OPERATIONAL_ENTITY:${delegation.delegatorOperationalEntityId}`);
  const delegateNode = by.get(`OPERATIONAL_ENTITY:${delegation.delegateOperationalEntityId}`);
  const parentNode = by.get(`TRUST_CONTRACT:${delegation.parentAuthorityId}`);
  if (!delegationNode || !delegatorNode || !delegateNode || !parentNode) throw new DelegatedAuthorityServerError("Delegation Evidence Graph nodes were not resolved.", "EVIDENCE_GRAPH_WRITE_FAILED", 503);
  const edges = edgeType === "DELEGATION_ACCEPTED_BY_ENTITY"
    ? [{ from_node_id: delegationNode, to_node_id: delegateNode, edge_type: edgeType }]
    : edgeType === "DELEGATION_REVOKED" || edgeType === "DELEGATION_EXPIRED"
      ? [{ from_node_id: delegationNode, to_node_id: delegateNode, edge_type: edgeType }]
      : [
          { from_node_id: delegatorNode, to_node_id: delegationNode, edge_type: "ENTITY_DELEGATED_AUTHORITY" },
          { from_node_id: delegationNode, to_node_id: delegateNode, edge_type: "ENTITY_RECEIVED_DELEGATED_AUTHORITY" },
          { from_node_id: delegationNode, to_node_id: parentNode, edge_type: "DELEGATION_DERIVED_FROM_AUTHORITY" },
        ];
  for (const edge of edges) {
    const existing = await db.from("evidence_graph_edges").select("edge_id").eq("enterprise_id", context.enterpriseId).eq("from_node_id", edge.from_node_id).eq("to_node_id", edge.to_node_id).eq("edge_type", edge.edge_type).limit(1);
    if (existing.error) fail("Delegation Evidence Graph edge lookup", existing.error);
    if (existing.data?.length) continue;
    const inserted = await db.from("evidence_graph_edges").insert({ ...edge, enterprise_id: context.enterpriseId, evidence_id: null, correlation_id: null });
    if (inserted.error) fail("Delegation Evidence Graph edges", inserted.error);
  }
}

async function extendActionGraph(context: DelegatedAuthorityContext, delegation: AuthorityDelegation, evaluationId: string, transactionId: string, authorized: boolean) {
  const db = createServiceRoleClient();
  const graphNodes = [
    { enterprise_id: context.enterpriseId, node_type: "AUTHORITY_DELEGATION", external_id: delegation.delegationId, domain_key: "AUTHORITY", label: delegation.objective, metadata: {} },
    { enterprise_id: context.enterpriseId, node_type: "CANONICAL_TRANSACTION", external_id: transactionId, domain_key: "AUTHORITY", label: evaluationId, metadata: { evaluationId } },
  ];
  const insertedNodes = await db.from("evidence_graph_nodes").upsert(graphNodes, { onConflict: "enterprise_id,node_type,external_id", ignoreDuplicates: true });
  if (insertedNodes.error) fail("Delegated action Evidence Graph nodes", insertedNodes.error);
  const nodes = await db.from("evidence_graph_nodes").select("node_id,node_type,external_id").eq("enterprise_id", context.enterpriseId).in("external_id", [delegation.delegationId, transactionId]);
  if (nodes.error) fail("Delegated action Evidence Graph resolution", nodes.error);
  const delegationNode = nodes.data?.find((node) => node.node_type === "AUTHORITY_DELEGATION")?.node_id;
  const actionNode = nodes.data?.find((node) => node.node_type === "CANONICAL_TRANSACTION")?.node_id;
  if (!delegationNode || !actionNode) throw new DelegatedAuthorityServerError("Delegated action graph nodes were not resolved.", "EVIDENCE_GRAPH_WRITE_FAILED", 503);
  const edgeType = authorized ? "ACTION_AUTHORIZED_BY_DELEGATION" : "APPLIES_TO";
  const existing = await db.from("evidence_graph_edges").select("edge_id").eq("enterprise_id", context.enterpriseId).eq("from_node_id", actionNode).eq("to_node_id", delegationNode).eq("edge_type", edgeType).limit(1);
  if (existing.error) fail("Delegated action Evidence Graph edge lookup", existing.error);
  if (!existing.data?.length) {
    const edge = await db.from("evidence_graph_edges").insert({ enterprise_id: context.enterpriseId, from_node_id: actionNode, to_node_id: delegationNode, edge_type: edgeType, evidence_id: null, correlation_id: null });
    if (edge.error) fail("Delegated action Evidence Graph edge", edge.error);
  }
}

export async function registerCanonicalNativeAgent(context: DelegatedAuthorityContext, raw: Record<string, unknown>) {
  ensureRole(context.role, ["owner", "admin"]);
  const displayReference = String(raw.displayReference ?? "").trim();
  if (!displayReference || displayReference.length > 240) throw new DelegatedAuthorityServerError("displayReference is invalid.", "OPERATIONAL_ENTITY_INPUT_INVALID");
  const entity = {
    entityId: reference(raw.entityId, "entityId"),
    displayReference,
    accountableOwnerId: reference(raw.accountableOwnerId, "accountableOwnerId"),
    organizationReference: reference(raw.organizationReference, "organizationReference"),
    environmentReference: reference(raw.environmentReference, "environmentReference"),
    workflowReference: reference(raw.workflowReference, "workflowReference"),
  };
  const canonicalDigest = hashCanonical({ ...entity, enterpriseId: context.enterpriseId, entityType: "ai_agent", lifecycleState: "active", authorityReferences: [] });
  const db = createServiceRoleClient();
  const registered = await db.rpc("register_native_agent_operational_entity_v1", { p_enterprise_id: context.enterpriseId, p_actor_id: context.user.id, p_entity: { ...entity, canonicalDigest } });
  if (registered.error) fail("Canonical native agent registration", registered.error);
  if (String((registered.data as Row)?.status) === "DUPLICATE") throw new DelegatedAuthorityServerError("The Operational Entity already exists.", "OPERATIONAL_ENTITY_ALREADY_EXISTS", 409);
  await appendReplay(context, entity.entityId, entity.displayReference.toLowerCase() === "agent beta" ? "BETA_REGISTERED" : "ENTITY_CHANGED", ["CANONICAL_OPERATIONAL_ENTITY_REGISTERED", "NATIVE_IDENTITY_PROOF_REQUIRED"], { entityId: entity.entityId, accountableOwnerId: entity.accountableOwnerId, canonicalDigest });
  return { ...(registered.data as Row), canonicalDigest, entityType: "ai_agent", authorityState: "NONE", nativeIdentityState: "PENDING" };
}

export async function createAuthorityDelegation(context: DelegatedAuthorityContext, delegatorId: string, raw: Record<string, unknown>) {
  ensureRole(context.role, ["owner", "admin"]);
  const supplied = raw.delegation as AuthorityDelegation;
  if (!supplied || typeof supplied !== "object") throw new DelegatedAuthorityServerError("A signed delegation is required.", "DELEGATION_INPUT_INVALID");
  const delegation: AuthorityDelegation = { ...supplied, delegationId: uuid(supplied.delegationId, "delegationId"), enterpriseId: context.enterpriseId, delegatorOperationalEntityId: delegatorId, status: "PENDING", revokedAt: null };
  uuid(delegation.parentAuthorityId, "parentAuthorityId");
  if (delegation.parentDelegationId) uuid(delegation.parentDelegationId, "parentDelegationId");
  const db = createServiceRoleClient();
  const parentDelegationResult = delegation.parentDelegationId
    ? await db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegation.parentDelegationId).eq("delegate_operational_entity_id", delegatorId).maybeSingle()
    : { data: null, error: null };
  if (parentDelegationResult.error) fail("Parent delegation resolution", parentDelegationResult.error);
  const parentDelegation = parentDelegationResult.data ? rowDelegation(parentDelegationResult.data) : null;
  const [{ parent }, delegatorIdentity, delegateIdentity] = await Promise.all([
    parentAuthorityFor(context.enterpriseId, delegation.parentAuthorityId, parentDelegation ? undefined : delegatorId), currentIdentity(context.enterpriseId, delegatorId), currentIdentity(context.enterpriseId, delegation.delegateOperationalEntityId),
  ]);
  verifySignedDelegation({ delegation, credential: delegatorIdentity.credential, expectedEnterpriseId: context.enterpriseId, expectedDelegatorId: delegatorId, expectedDelegateId: delegation.delegateOperationalEntityId });
  const immediateScope = parentDelegation?.scope ?? parent.scope;
  const subset = validateDelegatedAuthoritySubset({ parentScope: immediateScope, delegatedScope: delegation.scope, parentNotBefore: parentDelegation?.notBefore ?? parent.notBefore, parentExpiresAt: parentDelegation?.expiresAt ?? parent.expiresAt, delegatedNotBefore: delegation.notBefore, delegatedExpiresAt: delegation.expiresAt, parentMaximumDelegationDepth: parentDelegation?.maximumDelegationDepth ?? parent.maximumDelegationDepth, requestedDepth: delegation.depth });
  const ancestors = delegation.parentDelegationId
    ? await db.from("operational_entity_authority_delegations").select("delegator_operational_entity_id,delegate_operational_entity_id").eq("enterprise_id", context.enterpriseId).or(`delegation_id.eq.${delegation.parentDelegationId},parent_delegation_id.eq.${delegation.parentDelegationId}`)
    : { data: [], error: null };
  if (ancestors.error) fail("Delegation ancestor resolution", ancestors.error);
  const lineageIds = [...new Set((ancestors.data ?? []).flatMap((row) => [String(row.delegator_operational_entity_id), String(row.delegate_operational_entity_id)]))];
  const policy = evaluateDelegationPolicy({ parentAuthority: parent, parentDelegation, delegation, subsetValidation: subset, delegatorIdentity: delegatorIdentity.identity, delegateIdentity: delegateIdentity.identity, humanApprovalRequired: Boolean(raw.humanApprovalRequired), humanApprovalPresent: false, lineageEntityIds: lineageIds });
  const row = {
    delegation_id: delegation.delegationId, enterprise_id: context.enterpriseId, delegator_operational_entity_id: delegatorId, delegate_operational_entity_id: delegation.delegateOperationalEntityId,
    parent_authority_id: delegation.parentAuthorityId, parent_delegation_id: delegation.parentDelegationId, objective: delegation.objective,
    permitted_actions: delegation.scope.permittedActions, permitted_tools: delegation.scope.permittedTools, permitted_targets: delegation.scope.permittedTargets, environments: delegation.scope.environments,
    data_boundary: delegation.scope.dataBoundary, financial_limit: delegation.scope.financialLimit, execution_limit: delegation.scope.executionLimit,
    can_redelegate: delegation.canRedelegate, maximum_delegation_depth: delegation.maximumDelegationDepth, delegation_depth: delegation.depth,
    issued_at: delegation.issuedAt, not_before: delegation.notBefore, expires_at: delegation.expiresAt, revoked_at: null,
    policy_version: delegation.policyVersion, authority_version: delegation.authorityVersion, nonce: delegation.nonce, signing_key_id: delegation.signingKeyId,
    delegation_digest: delegation.delegationDigest, signature: delegation.signature, status: policy.decision === "REJECT" ? "REJECTED" : "PENDING",
    policy_decision: policy.decision, policy_reason_codes: policy.reasonCodes, evidence_references: [...new Set([...delegation.evidenceReferences, delegatorIdentity.identity.evidenceReference, delegateIdentity.identity.evidenceReference])], proposed_by: context.user.id,
  };
  const inserted = await db.from("operational_entity_authority_delegations").insert(row);
  if (inserted.error) fail("Authority delegation creation", inserted.error);
  await appendReplay(context, delegatorId, "DELEGATION_PROPOSED", policy.reasonCodes, { delegationId: delegation.delegationId, delegateOperationalEntityId: delegation.delegateOperationalEntityId, delegationDigest: delegation.delegationDigest });
  if (policy.decision !== "REJECT") {
    await appendReplay(context, delegatorId, "DELEGATION_VALIDATED", [...policy.reasonCodes, ...subset.reasonCodes], { delegationId: delegation.delegationId, subset });
    await extendGraph(context, delegation, "ENTITY_DELEGATED_AUTHORITY");
  }
  return { delegationId: delegation.delegationId, status: row.status, policy, subset };
}

export async function reviewAuthorityDelegation(context: DelegatedAuthorityContext, delegatorId: string, delegationId: string, approve: boolean) {
  ensureRole(context.role, ["owner", "admin"]);
  const db = createServiceRoleClient();
  const result = await db.from("operational_entity_authority_delegations").update({ policy_decision: approve ? "ACTIVATE" : "REJECT", status: approve ? "PENDING" : "REJECTED", policy_reason_codes: [approve ? "HUMAN_APPROVAL_RECORDED" : "HUMAN_REVIEW_REJECTED"], reviewed_by: context.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("enterprise_id", context.enterpriseId).eq("delegator_operational_entity_id", delegatorId).eq("delegation_id", uuid(delegationId, "delegationId")).eq("status", "PENDING").select("delegation_id,status,policy_decision").maybeSingle();
  if (result.error) fail("Delegation review", result.error);
  if (!result.data) throw new DelegatedAuthorityServerError("The pending delegation was not found.", "DELEGATION_NOT_FOUND", 404);
  return result.data;
}

export async function acceptAuthorityDelegation(context: DelegatedAuthorityContext, delegateId: string, raw: Record<string, unknown>) {
  ensureRole(context.role, ["owner", "admin"]);
  const acceptance = raw.acceptance as DelegationAcceptance;
  if (!acceptance || typeof acceptance !== "object") throw new DelegatedAuthorityServerError("A signed Beta acceptance is required.", "ACCEPTANCE_REQUIRED");
  uuid(acceptance.acceptanceId, "acceptanceId");
  const delegationId = uuid(acceptance.delegationId, "delegationId");
  const db = createServiceRoleClient();
  const stored = await db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegationId).eq("delegate_operational_entity_id", delegateId).maybeSingle();
  if (stored.error) fail("Delegation acceptance resolution", stored.error);
  if (!stored.data) throw new DelegatedAuthorityServerError("The delegation was not found for this entity.", "DELEGATION_NOT_FOUND", 404);
  const delegation = rowDelegation(stored.data);
  const beta = await currentIdentity(context.enterpriseId, delegateId);
  verifyDelegationAcceptance({ acceptance: { ...acceptance, enterpriseId: context.enterpriseId, delegateOperationalEntityId: delegateId }, delegation, credential: beta.credential, identity: beta.identity });
  const consumed = await db.rpc("accept_operational_entity_delegation_v1", { p_enterprise_id: context.enterpriseId, p_delegation_id: delegationId, p_delegate_operational_entity_id: delegateId, p_actor_id: context.user.id, p_acceptance: acceptance });
  if (consumed.error) fail("Atomic delegation acceptance", consumed.error);
  if (String((consumed.data as Row)?.status) === "DUPLICATE") throw new DelegatedAuthorityServerError("This delegation has already been accepted.", "DUPLICATE_ACCEPTANCE", 409);
  await appendReplay(context, delegateId, "BETA_ACCEPTED", ["BETA_IDENTITY_VERIFIED", "DELEGATION_ACCEPTANCE_VERIFIED"], { delegationId, acceptanceId: acceptance.acceptanceId }, [`delegation:${delegationId}`]);
  await appendReplay(context, delegateId, "DELEGATION_ACTIVATED", ["DELEGATION_POLICY_SATISFIED"], { delegationId }, [`acceptance:${acceptance.acceptanceId}`]);
  await remember(context, delegateId, "DELEGATION_ACTIVATED", delegationId, { from: delegation.delegatorOperationalEntityId, delegationDigest: delegation.delegationDigest, scope: delegation.scope });
  await extendGraph(context, delegation, "DELEGATION_ACCEPTED_BY_ENTITY");
  return consumed.data;
}

export async function revokeAuthorityDelegation(context: DelegatedAuthorityContext, delegatorId: string, delegationId: string, reason: string) {
  ensureRole(context.role, ["owner", "admin"]);
  const safeReason = reason.trim();
  if (!safeReason || safeReason.length > 500) throw new DelegatedAuthorityServerError("A bounded revocation reason is required.", "REVOCATION_REASON_REQUIRED");
  const db = createServiceRoleClient();
  const now = new Date().toISOString();
  const updated = await db.from("operational_entity_authority_delegations").update({ status: "REVOKED", revoked_at: now, revocation_reason: safeReason, updated_at: now }).eq("enterprise_id", context.enterpriseId).eq("delegator_operational_entity_id", delegatorId).eq("delegation_id", uuid(delegationId, "delegationId")).in("status", ["PENDING", "ACTIVE"]).select("*").maybeSingle();
  if (updated.error) fail("Delegation revocation", updated.error);
  if (!updated.data) throw new DelegatedAuthorityServerError("The active delegation was not found.", "DELEGATION_NOT_FOUND", 404);
  const delegation = rowDelegation(updated.data);
  await appendReplay(context, delegation.delegateOperationalEntityId, "DELEGATION_REVOKED", ["DELEGATION_REVOKED"], { delegationId, reason });
  await remember(context, delegation.delegateOperationalEntityId, "DELEGATION_REVOKED", delegationId, { reason, identityState: "UNCHANGED" });
  await extendGraph(context, delegation, "DELEGATION_REVOKED");
  return { delegationId, status: "REVOKED", revokedAt: now, identityState: "UNCHANGED" };
}

export async function revokeParentAuthority(context: DelegatedAuthorityContext, delegatorId: string, authorityId: string, reason: string) {
  ensureRole(context.role, ["owner", "admin"]);
  const safeReason = reason.trim();
  if (!safeReason || safeReason.length > 500) throw new DelegatedAuthorityServerError("A bounded revocation reason is required.", "REVOCATION_REASON_REQUIRED");
  const parentId = uuid(authorityId, "parentAuthorityId");
  await parentAuthorityFor(context.enterpriseId, parentId, delegatorId);
  const db = createServiceRoleClient();
  const revoked = await db.rpc("revoke_trust_contract_with_delegation_cascade_v1", { p_enterprise_id: context.enterpriseId, p_parent_authority_id: parentId, p_actor_id: context.user.id, p_reason: safeReason });
  if (revoked.error) fail("Parent authority revocation", revoked.error);
  const rows = Array.isArray((revoked.data as Row)?.affectedDelegations) ? (revoked.data as Row).affectedDelegations as Row[] : [];
  await appendReplay(context, delegatorId, "PARENT_AUTHORITY_REVOKED", ["PARENT_AUTHORITY_REVOKED", "CANONICAL_REEVALUATION_REQUIRED"], { parentAuthorityId: parentId, reason: safeReason, affectedDelegations: rows });
  await remember(context, delegatorId, "PARENT_AUTHORITY_REVOKED", parentId, { reason: safeReason, affectedDelegations: rows });
  for (const affected of rows) {
    const delegateId = String(affected.delegateOperationalEntityId);
    const delegationId = String(affected.delegationId);
    await appendReplay(context, delegateId, "DELEGATION_INVALIDATED", ["PARENT_AUTHORITY_REVOKED"], { parentAuthorityId: parentId, delegationId, identityState: "UNCHANGED" });
    await remember(context, delegateId, "DELEGATED_AUTHORITY_INVALIDATED", delegationId, { parentAuthorityId: parentId, reason: safeReason, identityState: "VERIFIED" });
  }
  const blastRadius = await authorityBlastRadius(context, parentId);
  return { ...(revoked.data as Row), blastRadius, identityState: "UNCHANGED" };
}

export async function loadDelegatedAuthority(context: DelegatedAuthorityContext, entityId: string, delegationId?: string) {
  const db = createServiceRoleClient();
  let query = db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId).or(`delegator_operational_entity_id.eq.${entityId},delegate_operational_entity_id.eq.${entityId}`).order("issued_at", { ascending: false }).limit(100);
  if (delegationId) query = query.eq("delegation_id", uuid(delegationId, "delegationId"));
  const delegations = await query;
  if (delegations.error) fail("Delegated authority retrieval", delegations.error);
  const ids = (delegations.data ?? []).map((row) => String(row.delegation_id));
  const [acceptances, evaluations] = ids.length ? await Promise.all([
    db.from("operational_entity_delegation_acceptances").select("*").eq("enterprise_id", context.enterpriseId).in("delegation_id", ids),
    db.from("operational_entity_delegated_action_evaluations").select("*").eq("enterprise_id", context.enterpriseId).in("delegation_id", ids).order("evaluated_at", { ascending: false }).limit(100),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (acceptances.error || evaluations.error) fail("Delegated authority lineage retrieval", acceptances.error ?? evaluations.error);
  return { delegations: delegations.data ?? [], acceptances: acceptances.data ?? [], evaluations: evaluations.data ?? [] };
}

type EvaluatedGovernanceControls = {
  capabilityGovernance?: CapabilityGovernanceEvaluation;
  interAgentAuthorityConflict?: InterAgentConflictEvaluation;
};

export async function evaluateStoredDelegatedAction(
  context: DelegatedAuthorityContext,
  delegateId: string,
  raw: Record<string, unknown>,
  evaluatedGovernance: EvaluatedGovernanceControls = {},
) {
  ensureRole(context.role, ["owner", "admin"]);
  const delegationId = uuid(raw.delegationId, "delegationId");
  const db = createServiceRoleClient();
  const [storedDelegation, storedAcceptance, beta] = await Promise.all([
    db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegationId).eq("delegate_operational_entity_id", delegateId).maybeSingle(),
    db.from("operational_entity_delegation_acceptances").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegationId).maybeSingle(),
    currentIdentity(context.enterpriseId, delegateId),
  ]);
  if (storedDelegation.error || storedAcceptance.error) fail("Delegated action resolution", storedDelegation.error ?? storedAcceptance.error);
  if (!storedDelegation.data || !storedAcceptance.data) throw new DelegatedAuthorityServerError("An active, accepted delegation is required.", "DELEGATED_AUTHORITY_NOT_FOUND", 404);
  const delegation = rowDelegation(storedDelegation.data);
  const acceptance = rowAcceptance(storedAcceptance.data);
  const { parent, contract } = await parentAuthorityFor(context.enterpriseId, delegation.parentAuthorityId, delegation.delegatorOperationalEntityId);
  const requested = raw.request as Record<string, unknown>;
  if (!requested || typeof requested !== "object") throw new DelegatedAuthorityServerError("A bounded delegated action is required.", "DELEGATED_ACTION_INVALID");
  const action = {
    type: String(requested.type ?? ""), tool: String(requested.tool ?? ""), target: String(requested.target ?? ""), environment: String(requested.environment ?? ""),
    purpose: String(requested.purpose ?? ""), dataBoundary: String(requested.dataBoundary ?? "PUBLIC") as AuthorityDelegation["scope"]["dataBoundary"],
    ...(requested.financialAmount === undefined ? {} : { financialAmount: Number(requested.financialAmount) }),
    ...(requested.executionCount === undefined ? {} : { executionCount: Number(requested.executionCount) }),
    workflowId: String(requested.workflowId ?? ""),
  };
  const evaluatedAt = new Date().toISOString();
  const result = evaluateDelegatedAction({ parentAuthority: parent, delegation, acceptance, delegateIdentity: beta.identity, action, now: evaluatedAt });
  const evaluationId = crypto.randomUUID();
  const decisionDigest = hashCanonical({ evaluationId, delegationId, delegateId, action, result: { decision: result.decision, reasonCodes: result.reasonCodes }, evaluatedAt });
  const persisted = await db.rpc("persist_delegated_action_evaluation_v1", { p_enterprise_id: context.enterpriseId, p_delegation_id: delegationId, p_delegate_operational_entity_id: delegateId, p_actor_id: context.user.id, p_evaluation: { evaluationId, canonicalTransactionId: null, actionType: action.type, actionTarget: action.target, actionTool: action.tool, environment: action.environment, decision: result.decision, reasonCodes: result.reasonCodes, authorityLineage: result.authorityLineage, decisionSnapshot: result.decisionSnapshot, decisionDigest, evaluatedAt } });
  if (persisted.error) fail("Transaction-safe delegated action evaluation", persisted.error);
  const gateDecision = String((persisted.data as Row)?.decision) as "ALLOW" | "REVIEW" | "DENY";
  const gateReasons = ((persisted.data as Row)?.reasonCodes as string[] | undefined) ?? result.reasonCodes;
  await appendReplay(context, delegateId, "BETA_ACTION_REQUESTED", gateReasons, { evaluationId, delegationId, action });
  const baseDependencies = createCanonicalTrustTransactionDependencies({ supabase: context.supabase, user: context.user });
  const delegatedContract: TrustContract = {
    ...(contract.contract as TrustContract), contractId: delegation.delegationId, enterpriseId: context.enterpriseId,
    subject: { type: "ai_agent", id: delegateId, displayName: delegateId }, subjectType: "ai_agent", subjectId: delegateId,
    workflow: { id: action.workflowId, objective: action.purpose }, workflowId: action.workflowId, authorizedObjective: action.purpose,
    requiredAuthority: [action.type], permittedScope: delegation.scope.permittedActions, expiresAt: delegation.expiresAt, revokedAt: parent.revokedAt ?? delegation.revokedAt,
    revocationState: parent.revokedAt || delegation.revokedAt ? "revoked" : "active", issuer: delegation.delegatorOperationalEntityId, approver: parent.accountableOwnerId,
    policyVersion: delegation.policyVersion, evidenceReferences: [
      { type: "authority_delegation", id: delegation.delegationId, version: delegation.authorityVersion },
      { type: "parent_authority", id: delegation.parentAuthorityId, version: parent.authorityVersion },
      { type: "native_identity_evidence", id: beta.identity.evidenceReference },
    ],
  };
  const dependencies = {
    ...baseDependencies,
    async loadAuthority(enterpriseId: string, subjectType: string, subjectId: string) {
      if (enterpriseId !== context.enterpriseId || subjectType !== "ai_agent" || subjectId !== delegateId) throw new DelegatedAuthorityServerError("Delegated authority tenant or subject mismatch.", "WRONG_TENANT", 403);
      return delegatedContract;
    },
    async requestExternalExecution() { return { configured: false, requestReference: null, acknowledgement: null, outcome: null }; },
  };
  const receipt = await executeCanonicalTrustTransaction({
    trustObject: { subjectType: "ai_agent", subjectId: delegateId }, operationalEntityId: delegateId,
    action: { type: action.type, purpose: action.purpose, resource: action.target, environment: action.environment, payloadDigest: String(requested.payloadDigest ?? "") },
    idempotencyKey: String(requested.idempotencyKey ?? ""),
    managedControl: {
      responsibilityLineage: { controlOwner: beta.identity.accountableOwnerId, policyApprover: parent.accountableOwnerId, controlOperator: delegateId, identityAuthorizationProvider: "cyber_sentinels_native", runtimeProvider: beta.identity.runtimeBinding, destinationSystem: action.target, evidenceProvider: "cyber_sentinels_native" },
      configurationRulesetDigest: delegation.delegationDigest,
      authorization: { decision: gateDecision, reasonCodes: gateReasons },
      capabilityGovernance: evaluatedGovernance.capabilityGovernance,
      interAgentAuthorityConflict: evaluatedGovernance.interAgentAuthorityConflict,
    },
  }, dependencies);
  const binding = receipt.decision === "ALLOW" ? await db.rpc("bind_native_enforcement_decision_v1", {
    p_enterprise_id: context.enterpriseId,
    p_evaluation_id: evaluationId,
    p_transaction_id: receipt.transactionId,
    p_operational_entity_id: delegateId,
    p_actor_id: context.user.id,
    p_bound_at: new Date().toISOString(),
  }) : { data: null, error: null };
  if (binding.error) fail("Native enforcement decision binding", binding.error);
  await extendActionGraph(context, delegation, evaluationId, receipt.transactionId, receipt.decision === "ALLOW");
  const decisionEvent = receipt.decision === "ALLOW" ? "BETA_ACTION_ALLOWED" : receipt.decision === "REVIEW" ? "BETA_ACTION_REVIEW_REQUIRED" : "BETA_ACTION_DENIED";
  await appendReplay(context, delegateId, decisionEvent, [...gateReasons, ...receipt.reasonCodes], { evaluationId, delegationId, transactionId: receipt.transactionId, action, decision: receipt.decision }, [`transaction:${receipt.transactionId}`]);
  if (receipt.decision === "DENY" && gateReasons.includes("ACTION_OUT_OF_DELEGATED_SCOPE")) {
    await appendReplay(context, delegateId, "BETA_SCOPE_VIOLATION_DENIED", gateReasons, { evaluationId, delegationId, transactionId: receipt.transactionId, action, decision: receipt.decision }, [`transaction:${receipt.transactionId}`]);
  }
  if (gateReasons.includes("DELEGATION_EXPIRED")) await extendGraph(context, delegation, "DELEGATION_EXPIRED");
  return { evaluationId, decision: receipt.decision, reasonCodes: [...new Set([...gateReasons, ...receipt.reasonCodes])], authorityLineage: result.authorityLineage, canonicalTransaction: receipt, enforcementDecisionBinding: binding.data, executionRequested: receipt.externalExecution.requested };
}

type PersistedGovernanceCase = "compatible" | "conflict";

async function persistGovernanceEvidence(input: {
  context: DelegatedAuthorityContext;
  subjectId: string;
  evidenceType: string;
  providerKey: string;
  sourceKey: string;
  normalizedFacts: Record<string, unknown>;
  occurredAt: string;
  expiresAt: string | null;
  reasonCodes: string[];
}) {
  const db = createServiceRoleClient();
  const evidenceId = crypto.randomUUID();
  const payloadHash = hashCanonical(input.normalizedFacts);
  const inserted = await db.from("evidence_objects").insert({
    id: evidenceId,
    evidence_id: evidenceId,
    enterprise_id: input.context.enterpriseId,
    envelope_id: null,
    provider_key: input.providerKey,
    evidence_classification: input.evidenceType,
    storage_boundary: "NORMALIZED_LEDGER",
    object_reference: null,
    object_encrypted: false,
    normalized_facts: input.normalizedFacts,
    occurred_at: input.occurredAt,
    retention_expires_at: input.expiresAt,
    legal_hold: false,
    domain_key: "AI_AGENT",
    subject_id: input.subjectId,
    subject_type: "ai_agent",
    evidence_type: input.evidenceType,
    source_type: "NATIVE_RUNTIME_EVALUATION",
    source_key: input.sourceKey,
    result: "POSITIVE",
    assurance_level: "HIGH",
    cryptographically_verified: true,
    server_verified: true,
    received_at: input.occurredAt,
    expires_at: input.expiresAt,
    payload_hash: payloadHash,
    canonicalization: "JCS",
    hash_algorithm: "SHA-256",
    reason_codes: input.reasonCodes,
    observed_at: input.occurredAt,
    freshness_policy_seconds: 3_600,
    revoked_at: null,
    superseded_by_evidence_id: null,
  });
  if (inserted.error) fail("Governance evidence persistence", inserted.error);
  return { evidenceId, payloadHash };
}

async function activeManifest(enterpriseId: string, operationalEntityId: string) {
  const db = createServiceRoleClient();
  const result = await db.from("operational_entity_manifests")
    .select("manifest_id,manifest,manifest_digest,expires_at")
    .eq("enterprise_id", enterpriseId)
    .eq("operational_entity_id", operationalEntityId)
    .eq("status", "ACTIVE")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) fail("Governed model manifest resolution", result.error);
  if (!result.data) throw new DelegatedAuthorityServerError("A current native manifest is required for capability governance.", "CAPABILITY_EVIDENCE_REQUIRED", 409);
  return result.data as Row;
}

async function persistRelationshipGraph(input: {
  context: DelegatedAuthorityContext;
  sourceEntityId: string;
  targetEntityId: string;
  evidenceId: string;
  conflict: boolean;
  correlationId: string;
}) {
  const db = createServiceRoleClient();
  const nodes = [
    { enterprise_id: input.context.enterpriseId, node_type: "OPERATIONAL_ENTITY", external_id: input.sourceEntityId, domain_key: "AI_AGENT", label: input.sourceEntityId, metadata: {}, correlation_id: input.correlationId },
    { enterprise_id: input.context.enterpriseId, node_type: "OPERATIONAL_ENTITY", external_id: input.targetEntityId, domain_key: "AI_AGENT", label: input.targetEntityId, metadata: {}, correlation_id: input.correlationId },
    { enterprise_id: input.context.enterpriseId, node_type: "EVIDENCE", external_id: input.evidenceId, domain_key: "AI_AGENT", label: "Inter-agent relationship evidence", metadata: {}, correlation_id: input.correlationId },
  ];
  const stored = await db.from("evidence_graph_nodes").upsert(nodes, { onConflict: "enterprise_id,node_type,external_id", ignoreDuplicates: true });
  if (stored.error) fail("Inter-agent Evidence Graph nodes", stored.error);
  const resolved = await db.from("evidence_graph_nodes")
    .select("node_id,node_type,external_id")
    .eq("enterprise_id", input.context.enterpriseId)
    .in("external_id", [input.sourceEntityId, input.targetEntityId, input.evidenceId]);
  if (resolved.error) fail("Inter-agent Evidence Graph resolution", resolved.error);
  const sourceNode = resolved.data?.find((node) => node.node_type === "OPERATIONAL_ENTITY" && node.external_id === input.sourceEntityId)?.node_id;
  const targetNode = resolved.data?.find((node) => node.node_type === "OPERATIONAL_ENTITY" && node.external_id === input.targetEntityId)?.node_id;
  const evidenceNode = resolved.data?.find((node) => node.node_type === "EVIDENCE" && node.external_id === input.evidenceId)?.node_id;
  if (!sourceNode || !targetNode || !evidenceNode) throw new DelegatedAuthorityServerError("Inter-agent Evidence Graph nodes were not resolved.", "EVIDENCE_GRAPH_WRITE_FAILED", 503);
  const edges = [
    { from_node_id: evidenceNode, to_node_id: targetNode, edge_type: "INVOLVES" },
    { from_node_id: sourceNode, to_node_id: targetNode, edge_type: input.conflict ? "CONFLICTS_WITH" : "CORRELATED_WITH" },
  ];
  for (const edge of edges) {
    const existing = await db.from("evidence_graph_edges")
      .select("edge_id")
      .eq("enterprise_id", input.context.enterpriseId)
      .eq("from_node_id", edge.from_node_id)
      .eq("to_node_id", edge.to_node_id)
      .eq("edge_type", edge.edge_type)
      .eq("evidence_id", input.evidenceId)
      .limit(1);
    if (existing.error) fail("Inter-agent Evidence Graph edge lookup", existing.error);
    if (existing.data?.length) continue;
    const inserted = await db.from("evidence_graph_edges").insert({
      enterprise_id: input.context.enterpriseId,
      ...edge,
      evidence_id: input.evidenceId,
      correlation_id: input.correlationId,
    });
    if (inserted.error) fail("Inter-agent Evidence Graph edge", inserted.error);
  }
}

function modelProjection(input: {
  enterpriseId: string;
  entityId: string;
  manifestRow: Row;
  assessmentId: string;
  assessmentDigest: string;
  environmentEvidenceId: string;
  environmentDigest: string;
  evaluatedAt: string;
}): ModelGovernanceProjection {
  const manifest = input.manifestRow.manifest as Row;
  const ai = (manifest.ai ?? {}) as Row;
  const software = (manifest.software ?? {}) as Row;
  const runtime = (manifest.runtime ?? {}) as Row;
  const modelId = String(ai.modelIdentifier ?? "");
  const modelVersion = String(ai.modelVersion ?? "");
  const modelHash = String(software.buildDigest ?? software.artifactDigest ?? "") || null;
  const environmentReference = input.environmentEvidenceId;
  const expiresAt = String(input.manifestRow.expires_at ?? manifest.expiresAt ?? "") || null;
  const toolSet = Array.isArray(ai.declaredTools) ? ai.declaredTools.map(String) : [];
  return {
    enterpriseId: input.enterpriseId,
    operationalEntityId: input.entityId,
    modelId,
    modelVersion,
    modelHash,
    fineTuneReference: null,
    deploymentOrigin: String(runtime.deploymentIdentifier ?? runtime.workloadIdentifier ?? "native-runtime"),
    hostingOperator: "customer_native_runtime",
    modelFamily: null,
    openClosedClassification: "self_hosted",
    capabilityAssessments: [{
      assessmentId: input.assessmentId,
      enterpriseId: input.enterpriseId,
      operationalEntityId: input.entityId,
      assessmentProvider: "cyber_sentinels_native",
      sourcePartyId: `workspace:${input.enterpriseId}`,
      assessmentType: "manifest_bound_runtime_capability",
      capabilityClass: "repository_operation",
      capabilityThreshold: "native_identity_and_authority_bound",
      capabilityDimensions: {
        nativeIdentityVerified: true,
        manifestBound: true,
        delegatedScopeEnforced: true,
        tenantIsolationEnforced: true,
      },
      evaluationReference: `native-manifest:${String(input.manifestRow.manifest_id)}`,
      environmentReference,
      assessedModelId: modelId,
      assessedModelVersion: modelVersion,
      assessedModelHash: modelHash,
      assessmentTimestamp: input.evaluatedAt,
      validFrom: input.evaluatedAt,
      validUntil: expiresAt,
      evidenceDigest: input.assessmentDigest,
      confidence: 0.95,
      attribution: "enterprise_attested_native_runtime",
    }],
    applicableOversightRegimes: ["enterprise_authority_policy"],
    safeguardsActive: ["delegated_scope_enforcement", "tenant_isolation"],
    environmentAttestation: {
      attestationReference: environmentReference,
      enterpriseId: input.enterpriseId,
      environment: String(runtime.environment ?? ""),
      runtimeReference: String(runtime.workloadIdentifier ?? runtime.deploymentIdentifier ?? "native-runtime"),
      hostingOperator: "customer_native_runtime",
      toolSet,
      observedAt: input.evaluatedAt,
      expiresAt,
      evidenceProvider: "cyber_sentinels_native",
      sourcePartyId: `workspace:${input.enterpriseId}`,
      evidenceDigest: input.environmentDigest,
    },
    enterpriseRiskClassification: "governed",
    evidenceTimestamp: input.evaluatedAt,
    evidenceExpiry: expiresAt,
    continuityReference: `native-manifest:${String(input.manifestRow.manifest_id)}`,
    permissionScope: Array.isArray(manifest.declaredCapabilities) ? manifest.declaredCapabilities.map(String) : [],
  };
}

export async function evaluatePersistedInterAgentAction(
  context: DelegatedAuthorityContext,
  sourceEntityId: string,
  raw: Record<string, unknown>,
) {
  ensureRole(context.role, ["owner", "admin"]);
  const caseType = String(raw.caseType ?? "") as PersistedGovernanceCase;
  if (!(["compatible", "conflict"] as string[]).includes(caseType)) throw new DelegatedAuthorityServerError("A supported governance case is required.", "GOVERNANCE_CASE_INVALID");
  const delegationId = uuid(raw.delegationId, "delegationId");
  const targetEntityId = reference(raw.targetEntityId, "targetEntityId");
  if (sourceEntityId === targetEntityId) throw new DelegatedAuthorityServerError("Inter-agent evaluation requires distinct entities.", "RELATIONSHIP_ENTITY_BINDING_INVALID");
  const requestedIdempotencyKey = reference(raw.idempotencyKey, "idempotencyKey");
  const evaluatedAt = new Date().toISOString();
  const correlationId = crypto.randomUUID();
  const db = createServiceRoleClient();

  const [storedDelegation, storedAcceptance, sourceIdentity, targetIdentity, sourceManifest, targetManifest] = await Promise.all([
    db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegationId).eq("delegate_operational_entity_id", sourceEntityId).maybeSingle(),
    db.from("operational_entity_delegation_acceptances").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegationId).eq("delegate_operational_entity_id", sourceEntityId).maybeSingle(),
    currentIdentity(context.enterpriseId, sourceEntityId),
    currentIdentity(context.enterpriseId, targetEntityId),
    activeManifest(context.enterpriseId, sourceEntityId),
    activeManifest(context.enterpriseId, targetEntityId),
  ]);
  if (storedDelegation.error || storedAcceptance.error) fail("Governed relationship authority resolution", storedDelegation.error ?? storedAcceptance.error);
  if (!storedDelegation.data || !storedAcceptance.data) throw new DelegatedAuthorityServerError("An active accepted source delegation is required.", "DELEGATED_AUTHORITY_NOT_FOUND", 404);
  const delegation = rowDelegation(storedDelegation.data);
  const { parent: sourceParent } = await parentAuthorityFor(context.enterpriseId, delegation.parentAuthorityId, delegation.delegatorOperationalEntityId);

  const baseDependencies = createCanonicalTrustTransactionDependencies({ supabase: context.supabase, user: context.user });
  if (!baseDependencies.resolveOperationalEntity) throw new DelegatedAuthorityServerError("Canonical Operational Entity resolution is unavailable.", "OPERATIONAL_ENTITY_RESOLUTION_UNAVAILABLE", 503);
  const resolutionInput = (entityId: string) => ({
    requestedEntityId: entityId,
    legacyHumanId: null,
    agentId: null,
    serviceIdentity: null,
    deviceIdentity: null,
    trustObjectReference: entityId,
    tenantId: context.enterpriseId,
    knownEntities: [],
  });
  const [sourceEntity, targetEntity] = await Promise.all([
    baseDependencies.resolveOperationalEntity(context.enterpriseId, resolutionInput(sourceEntityId)),
    baseDependencies.resolveOperationalEntity(context.enterpriseId, resolutionInput(targetEntityId)),
  ]) as [OperationalEntity, OperationalEntity];
  const targetAuthorityId = uuid(targetEntity.currentAuthorityReferences[0], "targetAuthorityId");
  const { parent: targetAuthority } = await parentAuthorityFor(context.enterpriseId, targetAuthorityId, targetEntityId);

  const assessmentFacts = {
    operationalEntityId: sourceEntityId,
    manifestId: String(sourceManifest.manifest_id),
    manifestDigest: String(sourceManifest.manifest_digest),
    identityEvidenceReference: sourceIdentity.identity.evidenceReference,
    assessmentType: "manifest_bound_runtime_capability",
    capabilityClass: "repository_operation",
    safeguards: ["delegated_scope_enforcement", "tenant_isolation"],
    assessedAt: evaluatedAt,
  };
  const capabilityEvidence = await persistGovernanceEvidence({
    context,
    subjectId: sourceEntityId,
    evidenceType: "CAPABILITY_ASSESSMENT",
    providerKey: "cyber_sentinels_native",
    sourceKey: `native-manifest:${String(sourceManifest.manifest_id)}`,
    normalizedFacts: assessmentFacts,
    occurredAt: evaluatedAt,
    expiresAt: String(sourceManifest.expires_at ?? "") || null,
    reasonCodes: ["ATTRIBUTED_CAPABILITY_ASSESSMENT", "NATIVE_IDENTITY_BOUND"],
  });
  const sourceRuntime = ((sourceManifest.manifest as Row).runtime ?? {}) as Row;
  const environmentFacts = {
    operationalEntityId: sourceEntityId,
    manifestId: String(sourceManifest.manifest_id),
    environment: String(sourceRuntime.environment ?? ""),
    runtimeReference: String(sourceRuntime.workloadIdentifier ?? sourceRuntime.deploymentIdentifier ?? "native-runtime"),
    observedAt: evaluatedAt,
  };
  const environmentEvidence = await persistGovernanceEvidence({
    context,
    subjectId: sourceEntityId,
    evidenceType: "MODEL_ENVIRONMENT_ATTESTATION",
    providerKey: "cyber_sentinels_native",
    sourceKey: `native-manifest:${String(sourceManifest.manifest_id)}`,
    normalizedFacts: environmentFacts,
    occurredAt: evaluatedAt,
    expiresAt: String(sourceManifest.expires_at ?? "") || null,
    reasonCodes: ["NATIVE_RUNTIME_ENVIRONMENT_ATTESTED"],
  });
  const projection = modelProjection({
    enterpriseId: context.enterpriseId,
    entityId: sourceEntityId,
    manifestRow: sourceManifest,
    assessmentId: capabilityEvidence.evidenceId,
    assessmentDigest: capabilityEvidence.payloadHash,
    environmentEvidenceId: environmentEvidence.evidenceId,
    environmentDigest: environmentEvidence.payloadHash,
    evaluatedAt,
  });
  const capabilityGovernance = evaluateCapabilityGovernance({
    entity: sourceEntity,
    current: projection,
    policy: {
      policyReference: `trust-policy:${delegation.policyVersion}`,
      requestedAction: "read_repository",
      requiredCapabilityClass: "repository_operation",
      allowedCapabilityClasses: ["repository_operation"],
      requiredSafeguards: ["delegated_scope_enforcement", "tenant_isolation"],
      requireModelHash: true,
      requireEnvironmentAttestation: true,
      requireHumanReviewForEvidenceConflict: true,
      denyWhenSafeguardMissing: true,
    },
    evaluatedAt,
  });

  const sharedResource = caseType === "compatible" ? "repository:a" : "repository:a/protected-configuration";
  const sourceRequest = {
    type: "read_repository",
    tool: "repository.reader",
    target: "repository:a",
    resource: sharedResource,
    environment: "preview-beta-runtime",
    dataBoundary: caseType === "conflict" ? "RESTRICTED" as const : "INTERNAL" as const,
  };
  const targetRequest = {
    type: caseType === "compatible" ? "read_repository" : "replace_configuration",
    tool: caseType === "compatible" ? "repository.reader" : "configuration.writer",
    target: "repository:a",
    resource: sharedResource,
    environment: "preview-gamma-runtime",
    dataBoundary: caseType === "conflict" ? "RESTRICTED" as const : "INTERNAL" as const,
  };
  const sourceConsequence = classifyOperationalConsequence({
    entity: sourceEntity,
    requestedAction: sourceRequest.type,
    target: sourceRequest.target,
    tool: sourceRequest.tool,
    resource: sourceRequest.resource,
    environment: sourceRequest.environment,
    dataBoundary: sourceRequest.dataBoundary.toLowerCase(),
    authority: { scope: delegation.scope.permittedActions },
    policy: { requiresHumanApproval: false },
    businessContext: caseType === "compatible" ? "read repository" : "preserve protected configuration",
    incidentContext: null,
  });
  const targetConsequence = classifyOperationalConsequence({
    entity: targetEntity,
    requestedAction: targetRequest.type,
    target: targetRequest.target,
    tool: targetRequest.tool,
    resource: targetRequest.resource,
    environment: targetRequest.environment,
    dataBoundary: targetRequest.dataBoundary.toLowerCase(),
    authority: { scope: targetAuthority.scope.permittedActions },
    policy: { requiresHumanApproval: false },
    businessContext: caseType === "compatible" ? "read repository" : "replace protected configuration",
    incidentContext: null,
  });
  const sourceEnvelope: AgentAuthorityEnvelope = {
    enterpriseId: context.enterpriseId,
    operationalEntityId: sourceEntityId,
    authorityReference: delegation.delegationId,
    authorityScope: delegation.scope,
    objective: {
      objectiveReference: `${requestedIdempotencyKey}:source-objective`,
      purpose: caseType === "compatible" ? "read repository" : "preserve protected configuration",
      effect: caseType === "compatible" ? "read" : "preserve",
      resource: sharedResource,
    },
    requestedAction: { ...sourceRequest, consequenceClassification: sourceConsequence.classification },
    validFrom: delegation.notBefore,
    expiresAt: delegation.expiresAt,
    revokedAt: sourceParent.revokedAt ?? delegation.revokedAt,
  };
  const targetEnvelope: AgentAuthorityEnvelope = {
    enterpriseId: context.enterpriseId,
    operationalEntityId: targetEntityId,
    authorityReference: targetAuthority.authorityId,
    authorityScope: targetAuthority.scope,
    objective: {
      objectiveReference: `${requestedIdempotencyKey}:target-objective`,
      purpose: caseType === "compatible" ? "read repository" : "replace protected configuration",
      effect: caseType === "compatible" ? "read" : "replace",
      resource: sharedResource,
    },
    requestedAction: { ...targetRequest, consequenceClassification: targetConsequence.classification },
    validFrom: targetAuthority.notBefore,
    expiresAt: targetAuthority.expiresAt,
    revokedAt: targetAuthority.revokedAt,
  };
  const relationshipFacts = {
    sourceAgent: sourceEntityId,
    targetAgent: targetEntityId,
    sourceAuthorityReference: delegation.delegationId,
    targetAuthorityReference: targetAuthority.authorityId,
    sharedWorkflow: "governed-repository-operations",
    sourceObjective: sourceEnvelope.objective,
    targetObjective: targetEnvelope.objective,
    sourceRequest: sourceEnvelope.requestedAction,
    targetRequest: targetEnvelope.requestedAction,
    sharedResources: [sharedResource],
    observedAt: evaluatedAt,
  };
  const relationshipStored = await persistGovernanceEvidence({
    context,
    subjectId: sourceEntityId,
    evidenceType: "INTER_AGENT_RELATIONSHIP_EVIDENCE",
    providerKey: "cyber_sentinels_native",
    sourceKey: `native-authority:${delegation.delegationId}:${targetAuthority.authorityId}`,
    normalizedFacts: relationshipFacts,
    occurredAt: evaluatedAt,
    expiresAt: [delegation.expiresAt, targetAuthority.expiresAt].sort()[0],
    reasonCodes: ["ATTRIBUTED_RELATIONSHIP_OBSERVATION", "AUTHORITY_INTERSECTION_EVALUATED"],
  });
  const relationshipEvidence: AgentRelationshipEvidence = {
    relationshipEvidenceId: relationshipStored.evidenceId,
    enterpriseId: context.enterpriseId,
    sourceAgent: sourceEntityId,
    targetAgent: targetEntityId,
    sharedWorkflow: "governed-repository-operations",
    sourceDelegatedObjective: sourceEnvelope.objective.objectiveReference,
    targetDelegatedObjective: targetEnvelope.objective.objectiveReference,
    sourceAuthorityReference: delegation.delegationId,
    targetAuthorityReference: targetAuthority.authorityId,
    authorityIntersection: [],
    sharedResources: [sharedResource],
    sharedCredentialsOrTools: [],
    interactionType: caseType === "compatible" ? "parallel_read" : "protected_configuration_change",
    relationshipType: caseType === "compatible" ? "cooperation" : "conflict",
    observedConditions: [],
    evidenceSource: "canonical_native_authority_runtime",
    evidenceProvider: "cyber_sentinels_native",
    sourcePartyId: `workspace:${context.enterpriseId}`,
    observedAt: evaluatedAt,
    evidenceDigest: relationshipStored.payloadHash,
    independentlyObserved: false,
  };
  const interAgentAuthorityConflict = evaluateInterAgentAuthorityConflict({
    sourceEntity,
    targetEntity,
    sourceAuthority: sourceEnvelope,
    targetAuthority: targetEnvelope,
    relationshipEvidence: [relationshipEvidence],
    policy: {
      policyReference: "enterprise-agent-conflict-policy:1.0.0",
      highImpactThreshold: "high",
      denyConditions: ["AGENT_DISABLES_PEER", "AGENT_IMPERSONATION_ATTEMPT", "CREDENTIAL_INTERFERENCE"],
      requireHumanArbitrationForHighImpact: true,
    },
    evaluatedAt,
  });

  await persistRelationshipGraph({
    context,
    sourceEntityId,
    targetEntityId,
    evidenceId: relationshipStored.evidenceId,
    conflict: interAgentAuthorityConflict.conflictState === "INTER_AGENT_CONFLICT",
    correlationId,
  });
  const eventType = interAgentAuthorityConflict.conflictState === "NO_CONFLICT"
    ? "INTER_AGENT_COMPATIBILITY_EVALUATED"
    : "INTER_AGENT_CONFLICT_EVALUATED";
  await appendReplay(context, sourceEntityId, "RELATIONSHIP_OBSERVED", ["ATTRIBUTED_RELATIONSHIP_OBSERVATION"], relationshipFacts, [`evidence:${relationshipStored.evidenceId}`]);
  await appendReplay(context, sourceEntityId, "AUTHORITY_INTERSECTION_EVALUATED", interAgentAuthorityConflict.reasonCodes, { authorityIntersection: interAgentAuthorityConflict.authorityIntersection, relationshipEvidenceId: relationshipStored.evidenceId });
  await appendReplay(context, sourceEntityId, eventType, interAgentAuthorityConflict.reasonCodes, { conflictState: interAgentAuthorityConflict.conflictState, policyResponse: interAgentAuthorityConflict.policyResponse, relationshipEvidenceId: relationshipStored.evidenceId });

  if (interAgentAuthorityConflict.conflictState === "INTER_AGENT_CONFLICT") {
    const pair = [sourceEntityId, targetEntityId].sort().join(":");
    await remember(context, sourceEntityId, "INTER_AGENT_CONFLICT_FIRST_OBSERVED", pair, {
      targetEntityId,
      relationshipEvidenceId: relationshipStored.evidenceId,
      snapshotDigest: interAgentAuthorityConflict.snapshot.digest,
    });
    if (interAgentAuthorityConflict.policyResponse !== "CONTINUE") {
      await remember(context, sourceEntityId, "AUTHORITY_CONSTRAINED_DUE_TO_CONFLICT", `${pair}:authority-constrained`, {
        targetEntityId,
        policyResponse: interAgentAuthorityConflict.policyResponse,
        snapshotDigest: interAgentAuthorityConflict.snapshot.digest,
      });
    }
  }

  const sourceResult = await evaluateStoredDelegatedAction(context, sourceEntityId, {
    delegationId,
    request: {
      type: sourceRequest.type,
      tool: sourceRequest.tool,
      target: sourceRequest.target,
      environment: sourceRequest.environment,
      purpose: "controlled_repository_access",
      dataBoundary: caseType === "conflict" ? "RESTRICTED" : "INTERNAL",
      executionCount: 1,
      workflowId: "governed-repository-operations",
      payloadDigest: hashCanonical({ relationshipEvidenceId: relationshipStored.evidenceId, sourceEnvelope, evaluatedAt }),
      idempotencyKey: `${requestedIdempotencyKey}:source`,
    },
  }, { capabilityGovernance, interAgentAuthorityConflict });

  const targetReceipt = await executeCanonicalTrustTransaction({
    trustObject: { subjectType: "ai_agent", subjectId: targetEntityId },
    operationalEntityId: targetEntityId,
    action: {
      type: targetRequest.type,
      purpose: "governed_repository_operations",
      resource: targetRequest.target,
      environment: targetRequest.environment,
      payloadDigest: hashCanonical({ relationshipEvidenceId: relationshipStored.evidenceId, targetEnvelope, evaluatedAt }),
    },
    idempotencyKey: `${requestedIdempotencyKey}:target`,
    managedControl: {
      responsibilityLineage: {
        controlOwner: targetIdentity.identity.accountableOwnerId,
        policyApprover: targetAuthority.accountableOwnerId,
        controlOperator: targetEntityId,
        identityAuthorizationProvider: "cyber_sentinels_native",
        runtimeProvider: targetIdentity.identity.runtimeBinding,
        destinationSystem: targetRequest.target,
        evidenceProvider: "cyber_sentinels_native",
      },
      configurationRulesetDigest: hashCanonical({ policy: "enterprise-agent-conflict-policy:1.0.0", targetAuthority: targetAuthority.authorityId }),
      interAgentAuthorityConflict,
    },
  }, baseDependencies);
  await appendReplay(context, targetEntityId, eventType, interAgentAuthorityConflict.reasonCodes, {
    relationshipEvidenceId: relationshipStored.evidenceId,
    transactionId: targetReceipt.transactionId,
    decision: targetReceipt.decision,
  }, [`transaction:${targetReceipt.transactionId}`]);

  return {
    caseType,
    capabilityGovernance,
    interAgentAuthorityConflict,
    evidence: {
      capabilityAssessment: capabilityEvidence.evidenceId,
      environmentAttestation: environmentEvidence.evidenceId,
      relationship: relationshipStored.evidenceId,
    },
    source: sourceResult,
    target: {
      operationalEntityId: targetEntityId,
      manifestId: String(targetManifest.manifest_id),
      decision: targetReceipt.decision,
      canonicalTransaction: targetReceipt,
    },
  };
}

export async function authorityBlastRadius(context: DelegatedAuthorityContext, authorityId: string) {
  const db = createServiceRoleClient();
  const [delegations, entities, transactions] = await Promise.all([
    db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId),
    db.from("operational_entities").select("entity_id,workflow_references").eq("enterprise_id", context.enterpriseId),
    db.from("canonical_trust_transactions").select("transaction_id,operational_entity_id,external_state").eq("enterprise_id", context.enterpriseId).in("external_state", ["NOT_REQUESTED", "REQUESTED"]),
  ]);
  if (delegations.error || entities.error || transactions.error) fail("Delegation blast-radius resolution", delegations.error ?? entities.error ?? transactions.error);
  return calculateDelegationBlastRadius({ rootAuthorityId: uuid(authorityId, "authorityId"), delegations: (delegations.data ?? []).map(rowDelegation), workflowReferences: Object.fromEntries((entities.data ?? []).map((row) => [String(row.entity_id), (row.workflow_references ?? []).map(String)])), pendingTransactionReferences: Object.fromEntries((entities.data ?? []).map((row) => [String(row.entity_id), (transactions.data ?? []).filter((tx) => tx.operational_entity_id === row.entity_id).map((tx) => String(tx.transaction_id))])) });
}
