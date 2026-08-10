import "server-only";

import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import type { DelegatedAuthorityContext } from "./delegated-authority-server";
import {
  correlateExecutionEvidence,
  deriveEnforcementActionDigest,
  deriveOutcomeHistoryReasons,
  executeAuthorizedAction,
  signDestinationObservation,
  verifyDestinationObservation,
  type DestinationObservation,
  type EnforcementAcknowledgement,
  type EnforcementAdapterResult,
  type EnforcementRequest,
  type ExecutionClaim,
  type HumanApproval,
  type RuntimeObservation,
} from "./native-enforcement";

type Row = Record<string, any>;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[A-Za-z0-9_.:/-]{1,240}$/;

export class NativeEnforcementServerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "NativeEnforcementServerError";
    this.code = code;
    this.status = status;
  }
}

function ensureRole(context: DelegatedAuthorityContext, allowed: DelegatedAuthorityContext["role"][]) {
  if (!allowed.includes(context.role)) throw new NativeEnforcementServerError("This enterprise role cannot operate enforcement.", "ENFORCEMENT_ROLE_DENIED", 403);
}

function uuid(value: unknown, name: string) {
  const result = String(value ?? "");
  if (!uuidPattern.test(result)) throw new NativeEnforcementServerError(`${name} is invalid.`, "ENFORCEMENT_INPUT_INVALID");
  return result;
}

function reference(value: unknown, name: string) {
  const result = String(value ?? "");
  if (!referencePattern.test(result)) throw new NativeEnforcementServerError(`${name} is invalid.`, "ENFORCEMENT_INPUT_INVALID");
  return result;
}

function fail(operation: string, error: unknown): never {
  console.error("Native enforcement failed safely.", { operation, code: (error as { code?: string })?.code ?? "UNKNOWN" });
  throw new NativeEnforcementServerError(`${operation} failed safely.`, "NATIVE_ENFORCEMENT_PERSISTENCE_FAILED", 503);
}

function evidenceKey() {
  const key = String(process.env.NATIVE_DESTINATION_EVIDENCE_KEY ?? "");
  if (Buffer.byteLength(key, "utf8") < 32) throw new NativeEnforcementServerError("Controlled destination evidence integrity is not configured.", "DESTINATION_EVIDENCE_KEY_MISSING", 503);
  return key;
}

function requestFromRow(row: Row): EnforcementRequest {
  return {
    requestId: String(row.request_id), enterpriseId: String(row.enterprise_id), transactionId: String(row.transaction_id), operationalEntityId: String(row.operational_entity_id),
    authorityId: String(row.authority_id), delegationId: String(row.delegation_id), action: { type: String(row.action_type), target: String(row.action_target), environment: String(row.environment), consequence: String(row.consequence) as EnforcementRequest["action"]["consequence"] },
    actionDigest: String(row.action_digest), decisionDigest: String(row.decision_digest), idempotencyKey: String(row.idempotency_key), requestedAt: String(row.requested_at),
  };
}

function acknowledgementFromRow(row: Row): EnforcementAcknowledgement {
  return {
    acknowledgementId: String(row.acknowledgement_id), enterpriseId: String(row.enterprise_id), transactionId: String(row.transaction_id), requestId: String(row.request_id), operationalEntityId: String(row.operational_entity_id),
    actionDigest: String(row.action_digest), target: String(row.target), idempotencyKey: String(row.idempotency_key), status: String(row.status) as EnforcementAcknowledgement["status"], adapterReference: row.adapter_reference ? String(row.adapter_reference) : null,
    acknowledgedAt: String(row.acknowledged_at), sourcePartyId: String(row.source_party_id),
  };
}

function claimFromRow(row: Row): ExecutionClaim {
  return { claimId: String(row.claim_id), enterpriseId: String(row.enterprise_id), transactionId: String(row.transaction_id), operationalEntityId: String(row.operational_entity_id), actionDigest: String(row.action_digest), target: String(row.target), idempotencyKey: String(row.idempotency_key), result: String(row.result) as ExecutionClaim["result"], claimedAt: String(row.claimed_at), sourcePartyId: String(row.source_party_id) };
}

function runtimeFromRow(row: Row): RuntimeObservation {
  return { observationId: String(row.observation_id), enterpriseId: String(row.enterprise_id), transactionId: String(row.transaction_id), operationalEntityId: String(row.operational_entity_id), actionDigest: String(row.action_digest), target: String(row.target), idempotencyKey: String(row.idempotency_key), result: String(row.result) as RuntimeObservation["result"], observedAt: String(row.observed_at), sourcePartyId: String(row.source_party_id) };
}

function destinationFromRow(row: Row): DestinationObservation {
  return {
    observationId: String(row.observation_id), enterpriseId: String(row.enterprise_id), transactionId: String(row.transaction_id), operationalEntityId: String(row.operational_entity_id), destinationId: String(row.destination_id), action: String(row.action), target: String(row.target), actionDigest: String(row.action_digest), idempotencyKey: String(row.idempotency_key),
    observedAt: String(row.observed_at), expiresAt: String(row.expires_at), result: String(row.result) as DestinationObservation["result"], destinationReference: String(row.destination_reference), evidenceDigest: String(row.evidence_digest), evidenceMac: String(row.evidence_mac), sourcePartyId: String(row.source_party_id),
  };
}

async function insertIgnoringDuplicate(table: string, payload: Row) {
  const db = createServiceRoleClient();
  const result = await db.from(table).insert(payload);
  if (result.error && result.error.code !== "23505") fail(`Persist ${table}`, result.error);
}

async function appendNativeReplay(context: DelegatedAuthorityContext, entityId: string, eventType: string, reasonCodes: string[], payload: Row, evidenceReferences: string[] = []) {
  const occurredAt = new Date().toISOString();
  const eventId = randomUUID();
  const eventDigest = hashCanonical({ eventId, enterpriseId: context.enterpriseId, entityId, eventType, reasonCodes, payload, occurredAt });
  await insertIgnoringDuplicate("operational_entity_native_replay_events", {
    event_id: eventId, enterprise_id: context.enterpriseId, operational_entity_id: entityId, event_type: eventType,
    actor_reference: `user:${context.user.id}`, attribution: "CYBER_SENTINELS_INTERPRETATION", evidence_references: evidenceReferences,
    reason_codes: reasonCodes, payload, event_digest: eventDigest, occurred_at: occurredAt,
  });
}

async function appendMaterialMemory(context: DelegatedAuthorityContext, entityId: string, memoryType: string, sourceId: string, summary: Row) {
  await insertIgnoringDuplicate("trust_memory_index", {
    enterprise_id: context.enterpriseId, subject_id: entityId, domain_key: "RUNTIME", memory_type: memoryType,
    source_id: sourceId, occurred_at: new Date().toISOString(), summary,
  });
}

async function loadAdapterResult(enterpriseId: string, request: EnforcementRequest): Promise<EnforcementAdapterResult> {
  const db = createServiceRoleClient();
  const [acks, claims, runtime, destination] = await Promise.all([
    db.from("native_enforcement_acknowledgements").select("*").eq("enterprise_id", enterpriseId).eq("request_id", request.requestId).order("acknowledged_at", { ascending: false }).limit(1),
    db.from("native_execution_claims").select("*").eq("enterprise_id", enterpriseId).eq("request_id", request.requestId).order("claimed_at", { ascending: false }).limit(1),
    db.from("native_runtime_execution_observations").select("*").eq("enterprise_id", enterpriseId).eq("request_id", request.requestId).order("observed_at", { ascending: false }).limit(1),
    db.from("native_destination_observations").select("*").eq("enterprise_id", enterpriseId).eq("request_id", request.requestId).order("observed_at", { ascending: false }).limit(1),
  ]);
  for (const result of [acks, claims, runtime, destination]) if (result.error) fail("Enforcement evidence retrieval", result.error);
  const ack = acks.data?.[0] ? acknowledgementFromRow(acks.data[0]) : null;
  return { status: ack?.status ?? "UNKNOWN", adapterReference: ack?.adapterReference ?? null, acknowledgedAt: ack?.acknowledgedAt ?? request.requestedAt, executionClaim: claims.data?.[0] ? claimFromRow(claims.data[0]) : null, runtimeObservation: runtime.data?.[0] ? runtimeFromRow(runtime.data[0]) : null, destinationObservation: destination.data?.[0] ? destinationFromRow(destination.data[0]) : null, reasonCodes: ack ? ["ENFORCEMENT_ACKNOWLEDGED"] : ["ENFORCEMENT_RESULT_UNKNOWN"] };
}

function controlledDestinationAdapter(context: DelegatedAuthorityContext) {
  return {
    async execute(request: EnforcementRequest): Promise<EnforcementAdapterResult> {
      if (!["repository:a", "controlled-repository-a"].includes(request.action.target) || !["READ", "WRITE_TEST_RECORD"].includes(request.action.type)) return { status: "REJECTED", adapterReference: null, acknowledgedAt: new Date().toISOString(), executionClaim: null, runtimeObservation: null, destinationObservation: null, reasonCodes: ["CONTROLLED_DESTINATION_SCOPE_REJECTED"] };
      const db = createServiceRoleClient();
      const occurredAt = new Date().toISOString();
      const recordId = randomUUID();
      const record = {
        record_id: recordId, enterprise_id: context.enterpriseId, destination_id: "controlled-repository-a", transaction_id: request.transactionId,
        operational_entity_id: request.operationalEntityId, action: request.action.type, target: request.action.target, idempotency_key: request.idempotencyKey,
        test_record: request.action.type === "WRITE_TEST_RECORD" ? { type: "CONTROLLED_TEST_RECORD", transactionId: request.transactionId } : null,
        result: "OBSERVED", occurred_at: occurredAt,
      };
      const stored = await db.from("controlled_destination_records").insert({ ...record, record_digest: hashCanonical(record) });
      if (stored.error && stored.error.code !== "23505") return { status: "FAILED", adapterReference: null, acknowledgedAt: occurredAt, executionClaim: null, runtimeObservation: null, destinationObservation: null, reasonCodes: ["CONTROLLED_DESTINATION_WRITE_FAILED"] };
      let destinationReference = `controlled-record:${recordId}`;
      if (stored.error?.code === "23505") {
        const existing = await db.from("controlled_destination_records").select("record_id").eq("enterprise_id", context.enterpriseId).eq("destination_id", "controlled-repository-a").eq("idempotency_key", request.idempotencyKey).maybeSingle();
        if (existing.error || !existing.data) fail("Controlled destination idempotency retrieval", existing.error);
        destinationReference = `controlled-record:${String(existing.data.record_id)}`;
      }
      const acknowledgement: EnforcementAcknowledgement = { acknowledgementId: randomUUID(), enterpriseId: context.enterpriseId, transactionId: request.transactionId, requestId: request.requestId, operationalEntityId: request.operationalEntityId, actionDigest: request.actionDigest, target: request.action.target, idempotencyKey: request.idempotencyKey, status: "ACCEPTED", adapterReference: destinationReference, acknowledgedAt: occurredAt, sourcePartyId: "cyber-sentinels" };
      const executionClaim: ExecutionClaim = { claimId: randomUUID(), enterpriseId: context.enterpriseId, transactionId: request.transactionId, operationalEntityId: request.operationalEntityId, actionDigest: request.actionDigest, target: request.action.target, idempotencyKey: request.idempotencyKey, result: "SUCCEEDED", claimedAt: occurredAt, sourcePartyId: "cyber-sentinels" };
      const runtimeObservation: RuntimeObservation = { observationId: randomUUID(), enterpriseId: context.enterpriseId, transactionId: request.transactionId, operationalEntityId: request.operationalEntityId, actionDigest: request.actionDigest, target: request.action.target, idempotencyKey: request.idempotencyKey, result: "OBSERVED", observedAt: occurredAt, sourcePartyId: "cyber-sentinels" };
      const destinationObservation = signDestinationObservation({ observationId: randomUUID(), enterpriseId: context.enterpriseId, transactionId: request.transactionId, operationalEntityId: request.operationalEntityId, destinationId: "controlled-repository-a", action: request.action.type, target: request.action.target, actionDigest: request.actionDigest, idempotencyKey: request.idempotencyKey, observedAt: occurredAt, expiresAt: new Date(Date.parse(occurredAt) + 5 * 60_000).toISOString(), result: "OBSERVED", destinationReference, sourcePartyId: "cyber-sentinels" }, evidenceKey());
      await Promise.all([
        insertIgnoringDuplicate("native_enforcement_acknowledgements", { acknowledgement_id: acknowledgement.acknowledgementId, enterprise_id: acknowledgement.enterpriseId, transaction_id: acknowledgement.transactionId, request_id: acknowledgement.requestId, operational_entity_id: acknowledgement.operationalEntityId, status: acknowledgement.status, action_digest: acknowledgement.actionDigest, target: acknowledgement.target, idempotency_key: acknowledgement.idempotencyKey, adapter_reference: acknowledgement.adapterReference, source_party_id: acknowledgement.sourcePartyId, reason_codes: ["CONTROLLED_DESTINATION_ACCEPTED"], acknowledged_at: acknowledgement.acknowledgedAt, acknowledgement_digest: hashCanonical(acknowledgement) }),
        insertIgnoringDuplicate("native_execution_claims", { claim_id: executionClaim.claimId, enterprise_id: executionClaim.enterpriseId, transaction_id: executionClaim.transactionId, request_id: request.requestId, operational_entity_id: executionClaim.operationalEntityId, action_digest: executionClaim.actionDigest, target: executionClaim.target, idempotency_key: executionClaim.idempotencyKey, result: executionClaim.result, source_party_id: executionClaim.sourcePartyId, claimed_at: executionClaim.claimedAt, claim_digest: hashCanonical(executionClaim) }),
        insertIgnoringDuplicate("native_runtime_execution_observations", { observation_id: runtimeObservation.observationId, enterprise_id: runtimeObservation.enterpriseId, transaction_id: runtimeObservation.transactionId, request_id: request.requestId, operational_entity_id: runtimeObservation.operationalEntityId, action_digest: runtimeObservation.actionDigest, target: runtimeObservation.target, idempotency_key: runtimeObservation.idempotencyKey, result: runtimeObservation.result, source_party_id: runtimeObservation.sourcePartyId, observed_at: runtimeObservation.observedAt, observation_digest: hashCanonical(runtimeObservation) }),
        insertIgnoringDuplicate("native_destination_observations", { observation_id: destinationObservation.observationId, enterprise_id: destinationObservation.enterpriseId, transaction_id: destinationObservation.transactionId, request_id: request.requestId, operational_entity_id: destinationObservation.operationalEntityId, destination_id: destinationObservation.destinationId, action: destinationObservation.action, target: destinationObservation.target, action_digest: destinationObservation.actionDigest, idempotency_key: destinationObservation.idempotencyKey, observed_at: destinationObservation.observedAt, expires_at: destinationObservation.expiresAt, result: destinationObservation.result, destination_reference: destinationObservation.destinationReference, evidence_digest: destinationObservation.evidenceDigest, evidence_mac: destinationObservation.evidenceMac, source_party_id: destinationObservation.sourcePartyId, ingested_by: context.user.id }),
      ]);
      await appendNativeReplay(context, request.operationalEntityId, "ENFORCEMENT_ACKNOWLEDGED", ["CONTROLLED_DESTINATION_ACCEPTED"], { requestId: request.requestId, transactionId: request.transactionId }, [`request:${request.requestId}`]);
      await appendNativeReplay(context, request.operationalEntityId, "DESTINATION_OBSERVED", ["DESTINATION_EXECUTION_OBSERVED"], { observationId: destinationObservation.observationId, transactionId: request.transactionId }, [`destination-observation:${destinationObservation.observationId}`]);
      return { status: "ACCEPTED", adapterReference: destinationReference, acknowledgedAt: occurredAt, executionClaim, runtimeObservation, destinationObservation, reasonCodes: ["CONTROLLED_DESTINATION_ACCEPTED"] };
    },
  };
}

async function extendOutcomeGraph(input: {
  context: DelegatedAuthorityContext;
  transactionId: string;
  request: EnforcementRequest | null;
  acknowledgement: Row | null;
  claim: Row | null;
  runtime: Row | null;
  destinations: Row[];
  outcomeId: string;
  incidentId: string | null;
}) {
  const db = createServiceRoleClient();
  const nodes = [
    { node_type: "TRUST_TRANSACTION", external_id: input.transactionId, domain_key: "WORKFLOW", label: "Canonical trust transaction", metadata: {} },
    ...(input.request ? [{ node_type: "ENFORCEMENT_REQUEST", external_id: input.request.requestId, domain_key: "RUNTIME", label: input.request.action.type, metadata: { actionDigest: input.request.actionDigest } }] : []),
    ...(input.acknowledgement ? [{ node_type: "ENFORCEMENT_ACKNOWLEDGEMENT", external_id: String(input.acknowledgement.acknowledgement_id), domain_key: "RUNTIME", label: String(input.acknowledgement.status), metadata: { sourcePartyId: input.acknowledgement.source_party_id } }] : []),
    ...(input.claim ? [{ node_type: "EXECUTION_CLAIM", external_id: String(input.claim.claim_id), domain_key: "RUNTIME", label: String(input.claim.result), metadata: { sourcePartyId: input.claim.source_party_id } }] : []),
    ...(input.runtime ? [{ node_type: "RUNTIME_EXECUTION_OBSERVATION", external_id: String(input.runtime.observation_id), domain_key: "RUNTIME", label: String(input.runtime.result), metadata: { sourcePartyId: input.runtime.source_party_id } }] : []),
    ...input.destinations.map((row) => ({ node_type: "DESTINATION_OBSERVATION", external_id: String(row.observation_id), domain_key: "RUNTIME", label: String(row.result), metadata: { destinationId: row.destination_id, sourcePartyId: row.source_party_id } })),
    { node_type: "ENFORCEMENT_OUTCOME", external_id: input.outcomeId, domain_key: "RUNTIME", label: "Evidence-correlated outcome", metadata: {} },
    ...(input.incidentId ? [{ node_type: "CONTROL_FAILURE", external_id: input.incidentId, domain_key: "GOVERNANCE", label: "Execution after DENY", metadata: {} }] : []),
  ];
  const written = await db.from("evidence_graph_nodes").upsert(nodes.map((node) => ({ ...node, enterprise_id: input.context.enterpriseId })), { onConflict: "enterprise_id,node_type,external_id" }).select("node_id,node_type,external_id");
  if (written.error) fail("Native enforcement Evidence Graph nodes", written.error);
  const ids = new Map((written.data ?? []).map((node) => [`${node.node_type}:${node.external_id}`, String(node.node_id)]));
  const txNode = ids.get(`TRUST_TRANSACTION:${input.transactionId}`);
  const outcomeNode = ids.get(`ENFORCEMENT_OUTCOME:${input.outcomeId}`);
  if (!txNode || !outcomeNode) fail("Native enforcement Evidence Graph node resolution", null);
  const requestNode = input.request ? ids.get(`ENFORCEMENT_REQUEST:${input.request.requestId}`) : null;
  const edges: Array<{ from_node_id: string; to_node_id: string; edge_type: string }> = [];
  if (requestNode) edges.push({ from_node_id: requestNode, to_node_id: txNode, edge_type: "ENFORCEMENT_REQUESTED_FOR" });
  const evidenceNodes = [
    input.acknowledgement ? { id: ids.get(`ENFORCEMENT_ACKNOWLEDGEMENT:${input.acknowledgement.acknowledgement_id}`), edge: "ACKNOWLEDGES_REQUEST" } : null,
    input.claim ? { id: ids.get(`EXECUTION_CLAIM:${input.claim.claim_id}`), edge: "CLAIMS_EXECUTION_OF" } : null,
    input.runtime ? { id: ids.get(`RUNTIME_EXECUTION_OBSERVATION:${input.runtime.observation_id}`), edge: "RUNTIME_OBSERVED_EXECUTION" } : null,
    ...input.destinations.map((row) => ({ id: ids.get(`DESTINATION_OBSERVATION:${row.observation_id}`), edge: "DESTINATION_OBSERVED_EXECUTION" })),
  ].filter((entry): entry is { id: string; edge: string } => Boolean(entry?.id));
  for (const evidence of evidenceNodes) {
    edges.push({ from_node_id: evidence.id, to_node_id: requestNode ?? txNode, edge_type: evidence.edge });
    edges.push({ from_node_id: outcomeNode, to_node_id: evidence.id, edge_type: "OUTCOME_CORRELATED_FROM" });
  }
  if (input.incidentId) {
    const incidentNode = ids.get(`CONTROL_FAILURE:${input.incidentId}`);
    if (incidentNode) edges.push({ from_node_id: incidentNode, to_node_id: txNode, edge_type: "CONTROL_FAILURE_FOR" });
  }
  for (const edge of edges) {
    const existing = await db.from("evidence_graph_edges").select("edge_id").eq("enterprise_id", input.context.enterpriseId).eq("from_node_id", edge.from_node_id).eq("to_node_id", edge.to_node_id).eq("edge_type", edge.edge_type).limit(1);
    if (existing.error) fail("Native enforcement Evidence Graph edge lookup", existing.error);
    if (existing.data?.length) continue;
    const inserted = await db.from("evidence_graph_edges").insert({ enterprise_id: input.context.enterpriseId, ...edge, evidence_id: null, correlation_id: null });
    if (inserted.error) fail("Native enforcement Evidence Graph edge", inserted.error);
  }
}

async function correlateAndPersist(context: DelegatedAuthorityContext, entityId: string, transactionId: string, request: EnforcementRequest | null) {
  const db = createServiceRoleClient();
  const [transaction, acknowledgements, claims, runtimes, destinations, previousOutcomes] = await Promise.all([
    db.from("canonical_trust_transactions").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).maybeSingle(),
    request ? db.from("native_enforcement_acknowledgements").select("*").eq("enterprise_id", context.enterpriseId).eq("request_id", request.requestId).order("acknowledged_at", { ascending: false }).limit(1) : Promise.resolve({ data: [], error: null }),
    request ? db.from("native_execution_claims").select("*").eq("enterprise_id", context.enterpriseId).eq("request_id", request.requestId).order("claimed_at", { ascending: false }).limit(1) : Promise.resolve({ data: [], error: null }),
    request ? db.from("native_runtime_execution_observations").select("*").eq("enterprise_id", context.enterpriseId).eq("request_id", request.requestId).order("observed_at", { ascending: false }).limit(1) : Promise.resolve({ data: [], error: null }),
    db.from("native_destination_observations").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).order("observed_at", { ascending: true }),
    db.from("native_enforcement_outcomes").select("transaction_id,outcome").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId).order("correlated_at", { ascending: false }).limit(100),
  ]);
  for (const result of [transaction, acknowledgements, claims, runtimes, destinations, previousOutcomes]) if (result.error) fail("Outcome correlation evidence retrieval", result.error);
  if (!transaction.data) throw new NativeEnforcementServerError("Canonical transaction not found.", "WRONG_TRANSACTION", 404);
  const baseCorrelation = correlateExecutionEvidence({ decision: String(transaction.data.decision) as "ALLOW" | "REVIEW" | "DENY", request, acknowledgement: acknowledgements.data?.[0] ? acknowledgementFromRow(acknowledgements.data[0]) : null, executionClaim: claims.data?.[0] ? claimFromRow(claims.data[0]) : null, runtimeObservation: runtimes.data?.[0] ? runtimeFromRow(runtimes.data[0]) : null, destinationObservations: (destinations.data ?? []).map(destinationFromRow), observationEvidenceKey: evidenceKey() });
  const historyReasons = deriveOutcomeHistoryReasons({ transactionId, outcome: baseCorrelation.outcome, history: (previousOutcomes.data ?? []).map((row) => ({ transactionId: String(row.transaction_id), outcome: String(row.outcome) as "CONFIRMED" | "UNKNOWN" | "CONTROL_FAILURE_CRITICAL" })) });
  const unsignedCorrelation = { ...baseCorrelation, reasonCodes: [...new Set([...baseCorrelation.reasonCodes, ...historyReasons])].sort() };
  const { correlationDigest: _priorDigest, ...correlationFields } = unsignedCorrelation;
  void _priorDigest;
  const correlation = { ...correlationFields, correlationDigest: hashCanonical(correlationFields) };
  const correlatedAt = new Date().toISOString();
  const outcomeId = randomUUID();
  const contradictions = correlation.contradictionCodes.map((code) => ({ contradictionId: randomUUID(), code, evidenceReferences: (destinations.data ?? []).map((row) => `destination-observation:${row.observation_id}`), digest: hashCanonical({ enterpriseId: context.enterpriseId, transactionId, entityId, code, correlationDigest: correlation.correlationDigest }) }));
  const persisted = await db.rpc("persist_native_enforcement_correlation_v1", { p_enterprise_id: context.enterpriseId, p_actor_id: context.user.id, p_entity_id: entityId, p_transaction_id: transactionId, p_request_id: request?.requestId ?? null, p_correlation: { outcomeId, ...correlation, contradictions, incidentId: correlation.outcome === "CONTROL_FAILURE_CRITICAL" ? randomUUID() : null, evidenceReferences: (destinations.data ?? []).map((row) => `destination-observation:${row.observation_id}`), correlatedAt } });
  if (persisted.error) fail("Outcome correlation persistence", persisted.error);
  const persistedOutcomeId = String((persisted.data as Row)?.outcomeId ?? outcomeId);
  const incidentId = (persisted.data as Row)?.incidentId ? String((persisted.data as Row).incidentId) : null;
  await extendOutcomeGraph({ context, transactionId, request, acknowledgement: acknowledgements.data?.[0] ?? null, claim: claims.data?.[0] ?? null, runtime: runtimes.data?.[0] ?? null, destinations: destinations.data ?? [], outcomeId: persistedOutcomeId, incidentId });
  if (correlation.outcome === "CONFIRMED") await appendNativeReplay(context, entityId, "OUTCOME_CONFIRMED", correlation.reasonCodes, { transactionId, outcomeId: persistedOutcomeId }, [`outcome:${persistedOutcomeId}`]);
  if (correlation.outcome === "CONTROL_FAILURE_CRITICAL") {
    await appendNativeReplay(context, entityId, "UNAUTHORIZED_EXECUTION_OBSERVED", correlation.contradictionCodes, { transactionId, outcomeId: persistedOutcomeId }, [`outcome:${persistedOutcomeId}`]);
    await appendNativeReplay(context, entityId, "CONTROL_FAILURE_DETECTED", correlation.reasonCodes, { transactionId, outcomeId: persistedOutcomeId, incidentId }, [`outcome:${persistedOutcomeId}`]);
  }
  if (correlation.reasonCodes.includes("CONTROL_RECOVERY_CONFIRMED")) await appendNativeReplay(context, entityId, "CONTROL_RECOVERY_CONFIRMED", correlation.reasonCodes, { transactionId, outcomeId: persistedOutcomeId }, [`outcome:${persistedOutcomeId}`]);
  return { outcomeId: persistedOutcomeId, ...correlation, incidentId };
}

export async function recordNativeEnforcementApproval(context: DelegatedAuthorityContext, entityId: string, raw: Record<string, unknown>) {
  ensureRole(context, ["owner", "admin"]);
  const transactionId = uuid(raw.transactionId, "transactionId");
  const lifetimeSeconds = Number(raw.lifetimeSeconds ?? 300);
  if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds < 30 || lifetimeSeconds > 900) {
    throw new NativeEnforcementServerError("Approval lifetime must be between 30 and 900 seconds.", "HUMAN_APPROVAL_LIFETIME_INVALID");
  }
  const db = createServiceRoleClient();
  const transaction = await db.from("canonical_trust_transactions").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).eq("decision", "ALLOW").maybeSingle();
  if (transaction.error) fail("Human approval transaction resolution", transaction.error);
  if (!transaction.data) throw new NativeEnforcementServerError("A tenant-scoped ALLOW transaction is required.", "HUMAN_APPROVAL_TRANSACTION_INVALID", 409);
  const consequence = String(transaction.data.decision_time_snapshot?.consequence ?? "LOW").toUpperCase();
  if (!["HIGH", "CRITICAL"].includes(consequence)) throw new NativeEnforcementServerError("This action does not require high-consequence approval.", "HUMAN_APPROVAL_NOT_REQUIRED", 409);
  const action = {
    type: String(transaction.data.action_type).toUpperCase(),
    target: String(transaction.data.action_resource),
    environment: String(transaction.data.action_environment),
    payloadDigest: String(transaction.data.request_digest),
    consequence: consequence as "HIGH" | "CRITICAL",
  };
  const actionDigest = deriveEnforcementActionDigest({ enterpriseId: context.enterpriseId, transactionId, operationalEntityId: entityId, action });
  if (raw.actionDigest && String(raw.actionDigest) !== actionDigest) throw new NativeEnforcementServerError("Approval action digest does not match decision-time truth.", "HUMAN_APPROVAL_ACTION_MISMATCH", 409);
  const approvedAt = new Date().toISOString();
  const approval: HumanApproval = {
    approvalId: randomUUID(), enterpriseId: context.enterpriseId, transactionId, operationalEntityId: entityId,
    actionDigest, approvedBy: context.user.id, approvedAt,
    expiresAt: new Date(Date.parse(approvedAt) + lifetimeSeconds * 1000).toISOString(), nonTransferable: true,
  };
  const inserted = await db.from("native_enforcement_human_approvals").insert({
    approval_id: approval.approvalId, enterprise_id: approval.enterpriseId, transaction_id: approval.transactionId,
    operational_entity_id: approval.operationalEntityId, action_digest: approval.actionDigest, approved_by: approval.approvedBy,
    approved_at: approval.approvedAt, expires_at: approval.expiresAt, non_transferable: true, approval_digest: hashCanonical(approval),
  });
  if (inserted.error?.code === "23505") throw new NativeEnforcementServerError("A non-transferable approval already exists for this exact transaction and action.", "HUMAN_APPROVAL_ALREADY_RECORDED", 409);
  if (inserted.error) fail("Human approval persistence", inserted.error);
  await appendNativeReplay(context, entityId, "HUMAN_APPROVAL_RECORDED", ["HIGH_CONSEQUENCE_APPROVAL_BOUND"], { transactionId, approvalId: approval.approvalId, actionDigest, expiresAt: approval.expiresAt }, [`transaction:${transactionId}`]);
  return approval;
}

export async function requestNativeEnforcement(context: DelegatedAuthorityContext, entityId: string, raw: Record<string, unknown>) {
  ensureRole(context, ["owner", "admin"]);
  const transactionId = uuid(raw.transactionId, "transactionId");
  const evaluationId = uuid(raw.evaluationId, "evaluationId");
  const idempotencyKey = reference(raw.idempotencyKey, "idempotencyKey");
  const db = createServiceRoleClient();
  const [binding, evaluation, transaction] = await Promise.all([
    db.from("native_enforcement_decision_bindings").select("*").eq("enterprise_id", context.enterpriseId).eq("evaluation_id", evaluationId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).maybeSingle(),
    db.from("operational_entity_delegated_action_evaluations").select("*").eq("enterprise_id", context.enterpriseId).eq("evaluation_id", evaluationId).eq("delegate_operational_entity_id", entityId).maybeSingle(),
    db.from("canonical_trust_transactions").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).maybeSingle(),
  ]);
  for (const result of [binding, evaluation, transaction]) if (result.error) fail("Enforcement decision resolution", result.error);
  if (!binding.data || !evaluation.data || !transaction.data) throw new NativeEnforcementServerError("A bound tenant-scoped decision is required.", "ENFORCEMENT_DECISION_NOT_BOUND", 404);
  const delegationId = String(evaluation.data.delegation_id);
  const delegation = await db.from("operational_entity_authority_delegations").select("*").eq("enterprise_id", context.enterpriseId).eq("delegation_id", delegationId).eq("delegate_operational_entity_id", entityId).maybeSingle();
  if (delegation.error) fail("Enforcement authority resolution", delegation.error);
  if (!delegation.data) throw new NativeEnforcementServerError("Delegated authority is unavailable.", "DELEGATED_AUTHORITY_NOT_FOUND", 404);
  const consequence = String(transaction.data.decision_time_snapshot?.consequence ?? "LOW").toUpperCase();
  const approvalResult = consequence === "HIGH" || consequence === "CRITICAL" ? await db.from("native_enforcement_human_approvals").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).maybeSingle() : { data: null, error: null };
  if (approvalResult.error) fail("Human approval resolution", approvalResult.error);
  const approval = approvalResult.data ? { approvalId: String(approvalResult.data.approval_id), enterpriseId: context.enterpriseId, transactionId, operationalEntityId: entityId, actionDigest: String(approvalResult.data.action_digest), approvedBy: String(approvalResult.data.approved_by), approvedAt: String(approvalResult.data.approved_at), expiresAt: String(approvalResult.data.expires_at), nonTransferable: true as const } : null;
  const input = { enterpriseId: context.enterpriseId, transactionId, operationalEntityId: entityId, authorityId: String(delegation.data.parent_authority_id), delegationId, action: { type: String(transaction.data.action_type).toUpperCase(), target: String(transaction.data.action_resource), environment: String(transaction.data.action_environment), payloadDigest: String(transaction.data.request_digest), consequence: (["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(consequence) ? consequence : "LOW") as "LOW" | "MODERATE" | "HIGH" | "CRITICAL" }, decision: String(transaction.data.decision) as "ALLOW" | "REVIEW" | "DENY", decisionDigest: String(binding.data.decision_digest), idempotencyKey, approval: approval as HumanApproval | null };
  const executed = await executeAuthorizedAction(input, {
    async findByIdempotencyKey(tenant, key) {
      const found = await db.from("native_enforcement_requests").select("*").eq("enterprise_id", tenant).eq("idempotency_key", key).maybeSingle();
      if (found.error) fail("Enforcement idempotency retrieval", found.error);
      if (!found.data) return null;
      const request = requestFromRow(found.data);
      return { request, result: await loadAdapterResult(tenant, request) };
    },
    async loadCurrentState(request) {
      const [authority, currentDelegation, verification, owner] = await Promise.all([
        db.from("trust_contracts").select("revocation_state,expires_at").eq("enterprise_id", context.enterpriseId).eq("contract_id", request.authorityId).maybeSingle(),
        db.from("operational_entity_authority_delegations").select("status,revoked_at,expires_at").eq("enterprise_id", context.enterpriseId).eq("delegation_id", request.delegationId).maybeSingle(),
        db.from("operational_entity_native_verifications").select("status,expires_at,runtime_binding").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId).order("verified_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("operational_entity_owner_bindings").select("state").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
      ]);
      for (const result of [authority, currentDelegation, verification, owner]) if (result.error) fail("Current enforcement state resolution", result.error);
      const instant = Date.now();
      return { enterpriseId: context.enterpriseId, operationalEntityId: entityId, authorityId: request.authorityId, delegationId: request.delegationId, authorityActive: authority.data?.revocation_state === "active" && Date.parse(String(authority.data?.expires_at)) > instant, delegationActive: currentDelegation.data?.status === "ACTIVE" && !currentDelegation.data?.revoked_at && Date.parse(String(currentDelegation.data?.expires_at)) > instant, identityVerified: verification.data?.status === "VERIFIED" && Date.parse(String(verification.data?.expires_at)) > instant, ownerConfirmed: owner.data?.state === "CONFIRMED", runtimeContinuity: verification.data?.runtime_binding === "RUNTIME_MATCH" ? "MATCH" : verification.data?.runtime_binding ? "CHANGED" : "UNKNOWN" };
    },
    async reserveRequest(request) {
      const reserved = await db.rpc("reserve_native_enforcement_request_v1", { p_enterprise_id: context.enterpriseId, p_actor_id: context.user.id, p_request: { requestId: request.requestId, evaluationId, transactionId, operationalEntityId: entityId, authorityId: request.authorityId, delegationId: request.delegationId, actionType: request.action.type, actionTarget: request.action.target, environment: request.action.environment, consequence: request.action.consequence, actionDigest: request.actionDigest, decisionDigest: request.decisionDigest, idempotencyKey: request.idempotencyKey, requestedAt: request.requestedAt } });
      if (reserved.error) fail("Current-state enforcement reservation", reserved.error);
      const data = reserved.data as Row;
      if (String(data.status) === "DUPLICATE") {
        const existing = await db.from("native_enforcement_requests").select("*").eq("enterprise_id", context.enterpriseId).eq("request_id", String(data.requestId)).maybeSingle();
        if (existing.error || !existing.data) fail("Concurrent enforcement reservation retrieval", existing.error);
        const existingRequest = requestFromRow(existing.data);
        return { created: false as const, request: existingRequest, result: await loadAdapterResult(context.enterpriseId, existingRequest) };
      }
      if (String(data.requestState) !== "REQUESTED") return { created: false as const, blocked: true as const, reasonCodes: Array.isArray(data.reasonCodes) ? data.reasonCodes.map(String) : ["ENFORCEMENT_CANCELLED"] };
      return { created: true as const };
    },
    adapter: controlledDestinationAdapter(context),
  });
  if (!executed.requested || !executed.request) {
    if (executed.eligibility.reasonCodes.includes("ENFORCEMENT_CANCELLED_AUTHORITY_CHANGED")) {
      await appendNativeReplay(context, entityId, "AUTHORITY_CHANGED_BEFORE_EXECUTION", executed.eligibility.reasonCodes, { transactionId, evaluationId });
      await appendMaterialMemory(context, entityId, "AUTHORITY_CHANGED_BEFORE_EXECUTION", `enforcement-cancel:${transactionId}:${evaluationId}`, { transactionId, evaluationId, reasonCodes: executed.eligibility.reasonCodes });
    }
    return { ...executed, outcome: null };
  }
  if (executed.duplicate) {
    const existingOutcome = await db.from("native_enforcement_outcomes").select("*").eq("enterprise_id", context.enterpriseId).eq("request_id", executed.request.requestId).order("correlated_at", { ascending: false }).limit(1).maybeSingle();
    if (existingOutcome.error) fail("Idempotent enforcement outcome retrieval", existingOutcome.error);
    return { ...executed, outcome: existingOutcome.data ?? null };
  }
  await appendNativeReplay(context, entityId, "ENFORCEMENT_REQUESTED", ["ENFORCEMENT_ELIGIBLE"], { requestId: executed.request.requestId, transactionId, evaluationId }, [`transaction:${transactionId}`]);
  const outcome = await correlateAndPersist(context, entityId, transactionId, executed.request);
  return { ...executed, outcome };
}

export async function ingestNativeDestinationObservation(context: DelegatedAuthorityContext, entityId: string, raw: Record<string, unknown>) {
  ensureRole(context, ["owner", "admin"]);
  const supplied = raw.observation as DestinationObservation;
  if (!supplied || typeof supplied !== "object") throw new NativeEnforcementServerError("A destination observation is required.", "DESTINATION_EVIDENCE_INVALID");
  verifyDestinationObservation({ observation: supplied, evidenceKey: evidenceKey(), expectedEnterpriseId: context.enterpriseId, expectedTransactionId: uuid(raw.transactionId, "transactionId"), expectedEntityId: entityId });
  const db = createServiceRoleClient();
  const transaction = await db.from("canonical_trust_transactions").select("transaction_id").eq("enterprise_id", context.enterpriseId).eq("transaction_id", supplied.transactionId).eq("operational_entity_id", entityId).maybeSingle();
  if (transaction.error) fail("Destination observation transaction resolution", transaction.error);
  if (!transaction.data) throw new NativeEnforcementServerError("Destination evidence transaction is unavailable.", "WRONG_TRANSACTION", 403);
  const requestResult = await db.from("native_enforcement_requests").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", supplied.transactionId).eq("operational_entity_id", entityId).maybeSingle();
  if (requestResult.error) fail("Destination observation request resolution", requestResult.error);
  await insertIgnoringDuplicate("native_destination_observations", { observation_id: supplied.observationId, enterprise_id: supplied.enterpriseId, transaction_id: supplied.transactionId, request_id: requestResult.data?.request_id ?? null, operational_entity_id: supplied.operationalEntityId, destination_id: supplied.destinationId, action: supplied.action, target: supplied.target, action_digest: supplied.actionDigest, idempotency_key: supplied.idempotencyKey, observed_at: supplied.observedAt, expires_at: supplied.expiresAt, result: supplied.result, destination_reference: supplied.destinationReference, evidence_digest: supplied.evidenceDigest, evidence_mac: supplied.evidenceMac, source_party_id: supplied.sourcePartyId, ingested_by: context.user.id });
  return correlateAndPersist(context, entityId, supplied.transactionId, requestResult.data ? requestFromRow(requestResult.data) : null);
}

export async function injectControlledExecutionAfterDeny(context: DelegatedAuthorityContext, entityId: string, raw: Record<string, unknown>) {
  ensureRole(context, ["owner", "admin"]);
  if (!(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview")) throw new NativeEnforcementServerError("Controlled failure injection is available only in Development or Preview.", "PRODUCTION_MUTATION_DENIED", 403);
  const transactionId = uuid(raw.transactionId, "transactionId");
  const db = createServiceRoleClient();
  const tx = await db.from("canonical_trust_transactions").select("*").eq("enterprise_id", context.enterpriseId).eq("transaction_id", transactionId).eq("operational_entity_id", entityId).eq("decision", "DENY").maybeSingle();
  if (tx.error) fail("Denied transaction resolution", tx.error);
  if (!tx.data) throw new NativeEnforcementServerError("An immutable tenant-scoped DENY is required.", "DENY_TRANSACTION_REQUIRED", 409);
  const occurredAt = new Date().toISOString();
  const idempotencyKey = `control-failure:${transactionId}`;
  if (!["repository:a", "controlled-repository-a"].includes(String(tx.data.action_resource))) throw new NativeEnforcementServerError("Controlled failure injection is limited to Repository A.", "CONTROLLED_DESTINATION_SCOPE_REJECTED", 409);
  const actionDigest = hashCanonical({ enterpriseId: context.enterpriseId, transactionId, operationalEntityId: entityId, action: { type: String(tx.data.action_type).toUpperCase(), target: String(tx.data.action_resource), environment: String(tx.data.action_environment), payloadDigest: String(tx.data.request_digest), consequence: "LOW" } });
  const recordId = randomUUID();
  const record = { record_id: recordId, enterprise_id: context.enterpriseId, destination_id: "controlled-repository-a", transaction_id: transactionId, operational_entity_id: entityId, action: String(tx.data.action_type).toUpperCase(), target: String(tx.data.action_resource), idempotency_key: idempotencyKey, test_record: { injectedControlFailure: true, transactionId }, result: "OBSERVED", occurred_at: occurredAt };
  const inserted = await db.from("controlled_destination_records").insert({ ...record, record_digest: hashCanonical(record) });
  if (inserted.error && inserted.error.code !== "23505") fail("Controlled denied execution persistence", inserted.error);
  const observation = signDestinationObservation({ observationId: randomUUID(), enterpriseId: context.enterpriseId, transactionId, operationalEntityId: entityId, destinationId: "controlled-repository-a", action: String(tx.data.action_type).toUpperCase(), target: String(tx.data.action_resource), actionDigest, idempotencyKey, observedAt: occurredAt, expiresAt: new Date(Date.parse(occurredAt) + 5 * 60_000).toISOString(), result: "OBSERVED", destinationReference: `controlled-record:${recordId}`, sourcePartyId: "cyber-sentinels" }, evidenceKey());
  await insertIgnoringDuplicate("native_destination_observations", { observation_id: observation.observationId, enterprise_id: observation.enterpriseId, transaction_id: observation.transactionId, request_id: null, operational_entity_id: observation.operationalEntityId, destination_id: observation.destinationId, action: observation.action, target: observation.target, action_digest: observation.actionDigest, idempotency_key: observation.idempotencyKey, observed_at: observation.observedAt, expires_at: observation.expiresAt, result: observation.result, destination_reference: observation.destinationReference, evidence_digest: observation.evidenceDigest, evidence_mac: observation.evidenceMac, source_party_id: observation.sourcePartyId, ingested_by: context.user.id });
  return correlateAndPersist(context, entityId, transactionId, null);
}

export async function loadNativeEnforcement(context: DelegatedAuthorityContext, entityId: string, transactionId?: string) {
  ensureRole(context, ["owner", "admin", "reviewer", "observer"]);
  const db = createServiceRoleClient();
  const applyTransaction = (query: any) => transactionId ? query.eq("transaction_id", uuid(transactionId, "transactionId")) : query;
  const [requests, acknowledgements, claims, runtime, destinations, outcomes, contradictions] = await Promise.all([
    applyTransaction(db.from("native_enforcement_requests").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId)).order("requested_at", { ascending: false }).limit(100),
    applyTransaction(db.from("native_enforcement_acknowledgements").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId)).order("acknowledged_at", { ascending: false }).limit(100),
    applyTransaction(db.from("native_execution_claims").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId)).order("claimed_at", { ascending: false }).limit(100),
    applyTransaction(db.from("native_runtime_execution_observations").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId)).order("observed_at", { ascending: false }).limit(100),
    applyTransaction(db.from("native_destination_observations").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId)).order("observed_at", { ascending: false }).limit(100),
    applyTransaction(db.from("native_enforcement_outcomes").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", entityId)).order("correlated_at", { ascending: false }).limit(100),
    applyTransaction(db.from("native_execution_contradictions").select("*").eq("enterprise_id", context.enterpriseId)).order("detected_at", { ascending: false }).limit(100),
  ]);
  for (const result of [requests, acknowledgements, claims, runtime, destinations, outcomes, contradictions]) if (result.error) fail("Native enforcement history retrieval", result.error);
  return { requests: requests.data ?? [], acknowledgements: acknowledgements.data ?? [], executionClaims: claims.data ?? [], runtimeObservations: runtime.data ?? [], destinationObservations: destinations.data ?? [], outcomes: outcomes.data ?? [], contradictions: contradictions.data ?? [] };
}
