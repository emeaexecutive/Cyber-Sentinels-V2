import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { executeCanonicalTrustAssessment } from "@/lib/core/trust-lifecycle-orchestrator";
import { recordRuntimeProfile } from "@/lib/performance/runtime-profiler";
import {
  containsRestrictedProviderData,
  evaluateProviderEvidenceQuality,
  normalizeHopaeProviderEvidence,
} from "@/lib/providers/hopae-rc1";
import { ProviderError } from "@/lib/providers/errors";
import { getSelectedProviderAdapter } from "@/lib/providers/provider-service";
import { hashValue } from "@/lib/security";
import { completeWebhookEvent, reserveWebhookEvent } from "@/lib/webhooks/event-ledger";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[a-zA-Z0-9_.:-]{1,120}$/;

export class Rc1ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly reasonCode: "HOPAE_SIGNATURE_INVALID" | "HOPAE_SIGNATURE_EXPIRED" | "HOPAE_PROVIDER_ERROR" = "HOPAE_PROVIDER_ERROR"
  ) {
    super(message);
    this.name = "Rc1ProviderError";
  }
}

function requiredReference(value: unknown, label: string, uuid = false) {
  const text = String(value ?? "").trim();
  if (!(uuid ? uuidPattern : referencePattern).test(text)) {
    throw new Rc1ProviderError(`A valid ${label} is required.`, 400, `invalid_${label.replace(/\s+/g, "_")}`);
  }
  return text;
}

function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter((item) => referencePattern.test(item))
    : [];
}

export async function startHopaeTrustAssessment(input: {
  supabase: SupabaseClient;
  user: User;
  body: Record<string, unknown>;
  appUrl: string;
}) {
  const workspaceId = requiredReference(input.body.tenant_id ?? input.body.workspace_id, "tenant_id", true);
  const workflowId = requiredReference(input.body.workflow_id, "workflow_id", true);
  const requestedAction = requiredReference(input.body.requested_action, "requested_action");
  const requestedPurpose = requiredReference(input.body.requested_purpose, "requested_purpose");
  const hopaeProviderId = requiredReference(process.env.HOPAE_PROVIDER_ID, "configured_hopae_provider_id");
  const entityId = input.body.entity_id ? requiredReference(input.body.entity_id, "entity_id", true) : input.user.id;
  const correlationId = crypto.randomUUID();
  let adapter;
  try { adapter = getSelectedProviderAdapter(correlationId); } catch (error) {
    if (error instanceof ProviderError) throw new Rc1ProviderError(error.safeMessage, error.httpStatus, error.code.toLowerCase());
    throw error;
  }

  const databaseStarted = Date.now();
  const [workspaceResult, workflowResult, policiesResult] = await Promise.all([
    input.supabase.from("trust_workspaces").select("id,name,created_by").eq("id", workspaceId).maybeSingle(),
    input.supabase.from("trust_cases").select("id,workspace_id,status,created_by").eq("id", workflowId).eq("workspace_id", workspaceId).maybeSingle(),
    input.supabase.from("governance_policies").select("id,name,trigger_type,action_type,requires_human_review,allowed_actions,allowed_purposes,minimum_evidence,authority_expires_at,authority_revoked").eq("workspace_id", workspaceId).limit(100),
  ]);
  recordRuntimeProfile({ stage: "database_query_latency", latencyMs: Date.now() - databaseStarted, ok: !workspaceResult.error && !workflowResult.error && !policiesResult.error, degraded: Boolean(workspaceResult.error || workflowResult.error || policiesResult.error), metadata: { correlationId, tenantId: workspaceId, workflowType: requestedPurpose } });
  if (workspaceResult.error || !workspaceResult.data) throw new Rc1ProviderError("Tenant is not available to the authenticated user.", 403, "tenant_access_denied");
  if (workflowResult.error || !workflowResult.data) throw new Rc1ProviderError("Workflow is unknown or outside the tenant.", 404, "unknown_workflow");
  if (policiesResult.error) throw new Rc1ProviderError("Workflow policy could not be resolved.", 503, "policy_unavailable");

  const policies = policiesResult.data ?? [];
  const matchingPolicy = policies.find((policy) =>
    textArray(policy.allowed_actions).includes(requestedAction) &&
    textArray(policy.allowed_purposes).includes(requestedPurpose)
  );
  const allowedActions = matchingPolicy ? textArray(matchingPolicy.allowed_actions) : [];
  const allowedPurposes = matchingPolicy ? textArray(matchingPolicy.allowed_purposes) : [];
  const authorityExpired = Boolean(matchingPolicy?.authority_expires_at) && Date.parse(String(matchingPolicy?.authority_expires_at)) <= Date.now();
  const delegationValid = Boolean(matchingPolicy) && matchingPolicy?.authority_revoked !== true && !authorityExpired;
  const nonce = crypto.randomUUID();
  const redirectUri = new URL("/demo/trust-execution-flow", input.appUrl).toString();
  const executionClient = createServiceRoleClient();
  const registryResult = await executionClient.from("provider_registry").select("enabled").eq("provider_id", adapter.id).maybeSingle();
  if (registryResult.error || registryResult.data?.enabled !== true) {
    throw new Rc1ProviderError("The server-selected identity provider is disabled by provider governance.", 503, "provider_disabled");
  }
  const { error: executionCreateError } = await executionClient.from("provider_execution_records").insert({
    provider_id: adapter.id,
    environment: adapter.environment,
    runtime_mode: "Test",
    tenant_id: workspaceId,
    workflow_id: workflowId,
    correlation_id: correlationId,
    request_created_at: new Date().toISOString(),
    status: "request_created",
    limitations: ["A provider session request is not identity proof and cannot authorize."],
  });
  if (executionCreateError) throw new Rc1ProviderError("Provider execution evidence could not be retained before the upstream call.", 500, "execution_record_failed");
  const providerStarted = Date.now();
  let created;
  try {
    created = await adapter.createSession({
      context: { tenantId: workspaceId, actorId: input.user.id, trustSessionId: workflowId, correlationId },
      purpose: requestedPurpose,
      redirectUri,
      idempotencyKey: correlationId,
    });
  } catch (error) {
    const timeout = error instanceof ProviderError ? error.code === "PROVIDER_TIMEOUT" : error instanceof Error && /timed out/i.test(error.message);
    await executionClient.from("provider_execution_records").update({ status: "failed", signature_status: "not_applicable", limitations: [error instanceof ProviderError ? error.code : "PROVIDER_UNAVAILABLE"], updated_at: new Date().toISOString() }).eq("correlation_id", correlationId);
    recordRuntimeProfile({ stage: "provider_latency", latencyMs: Date.now() - providerStarted, ok: false, degraded: true, metadata: { provider: "hopae_connect", timeout } });
    if (error instanceof ProviderError) throw new Rc1ProviderError(error.safeMessage, error.httpStatus, error.code.toLowerCase());
    throw new Rc1ProviderError(timeout ? "Hopae Connect timed out safely." : "Hopae Connect is unavailable.", 503, timeout ? "provider_timeout" : "provider_unavailable");
  }
  const verificationId = created.providerSessionId;
  const runtimeState = "Test Mode";
  const sourceMode = adapter.environment === "production" ? "live" : "test";
  recordRuntimeProfile({ stage: "provider_latency", latencyMs: Date.now() - providerStarted, ok: true, degraded: adapter.environment !== "production", metadata: { provider: "hopae_connect", source_mode: sourceMode } });

  const { error } = await input.supabase.from("hopae_verifications").insert({
    verification_id: verificationId,
    owner_user_id: input.user.id,
    owner_email: input.user.email ?? null,
    status: "pending",
    provider_id: hopaeProviderId,
    redirect_uri: redirectUri,
    match_data: {},
    workspace_id: workspaceId,
    workflow_id: workflowId,
    entity_id: entityId,
    entity_type: "human",
    correlation_id: correlationId,
    nonce_hash: hashValue(nonce),
    requested_action: requestedAction,
    requested_purpose: requestedPurpose,
    authority_expires_at: matchingPolicy?.authority_expires_at ?? null,
    authority_revoked: matchingPolicy?.authority_revoked === true,
    delegation_valid: delegationValid,
    policy_id: matchingPolicy?.id ?? null,
    policy_version: matchingPolicy ? `governance-policy:${matchingPolicy.id}` : "policy:not-configured",
    allowed_actions: allowedActions,
    allowed_purposes: allowedPurposes,
    minimum_evidence: Math.max(1, Math.min(20, Number(matchingPolicy?.minimum_evidence ?? 1))),
    runtime_state: runtimeState,
    source_mode: sourceMode,
    retention_status: "normalized_only",
  });
  if (error) {
    await executionClient.from("provider_execution_records").update({ status: "failed", limitations: ["Provider session was created upstream but the local tenant-scoped session could not be retained."], updated_at: new Date().toISOString() }).eq("correlation_id", correlationId);
    throw new Rc1ProviderError("Trust assessment session could not be retained.", 500, "session_persistence_failed");
  }
  const { error: executionUpdateError } = await executionClient.from("provider_execution_records").update({
    provider_session_id: verificationId,
    provider_request_id: created.providerRequestId,
    limitations: ["Live is prohibited until a signed callback, provider retrieval, normalized evidence persistence, and linked trust pipeline complete."],
    updated_at: new Date().toISOString(),
  }).eq("correlation_id", correlationId);
  if (executionUpdateError) throw new Rc1ProviderError("Provider execution evidence could not be associated with the provider session.", 500, "execution_record_update_failed");

  return {
    ok: true,
    action: "Establish Trust",
    assessmentStatus: "provider_evidence_pending",
    provider: { id: "hopae_connect", name: "Hopae Connect", runtimeState, sourceMode },
    providerReference: verificationId,
    providerRedirect: created.clientAction?.type === "redirect" ? created.clientAction.value : null,
    clientAction: created.clientAction,
    correlationId,
    tenantId: workspaceId,
    workflowId,
    policy: { reference: matchingPolicy ? `governance-policy:${matchingPolicy.id}` : "policy:not-configured", delegationValid },
    limitation: delegationValid ? "Identity evidence remains subject to authority and policy at callback time." : "No current, non-revoked workflow policy grants this action and purpose; the provider result cannot authorize it.",
  };
}

export async function retrieveHopaeTrustAssessment(input: {
  supabase: SupabaseClient;
  user: User;
  providerSessionId: string;
}) {
  const providerSessionId = requiredReference(input.providerSessionId, "provider_session_id");
  const { data, error } = await input.supabase
    .from("hopae_verifications")
    .select("verification_id,workspace_id,workflow_id,correlation_id,status,provider_session_status,last_polled_at,expires_at,updated_at")
    .eq("verification_id", providerSessionId)
    .maybeSingle();
  if (error || !data) throw new Rc1ProviderError("Provider session is unknown or outside the authenticated scope.", 404, "provider_session_not_found");
  if (data.last_polled_at && Date.now() - Date.parse(data.last_polled_at) < 3_000) {
    throw new Rc1ProviderError("Provider session was polled too recently.", 429, "provider_rate_limited");
  }
  const context = {
    tenantId: String(data.workspace_id),
    actorId: input.user.id,
    trustSessionId: String(data.workflow_id),
    correlationId: String(data.correlation_id),
  };
  let adapter;
  try { adapter = getSelectedProviderAdapter(context.correlationId); } catch (providerError) {
    if (providerError instanceof ProviderError) throw new Rc1ProviderError(providerError.safeMessage, providerError.httpStatus, providerError.code.toLowerCase());
    throw providerError;
  }
  const registryResult = await createServiceRoleClient().from("provider_registry").select("enabled").eq("provider_id", adapter.id).maybeSingle();
  if (registryResult.error || registryResult.data?.enabled !== true) throw new Rc1ProviderError("The identity provider is disabled by provider governance.", 503, "provider_disabled");
  let retrieved;
  try { retrieved = await adapter.retrieveSession(providerSessionId, context); } catch (providerError) {
    if (providerError instanceof ProviderError) throw new Rc1ProviderError(providerError.safeMessage, providerError.httpStatus, providerError.code.toLowerCase());
    throw providerError;
  }
  const terminal = ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(String(data.provider_session_status));
  const nextStatus = terminal ? String(data.provider_session_status) : retrieved.status;
  const { error: updateError } = await input.supabase.from("hopae_verifications").update({
    provider_session_status: nextStatus,
    last_polled_at: new Date().toISOString(),
    expires_at: retrieved.expiresAt ?? data.expires_at,
    updated_at: new Date().toISOString(),
  }).eq("verification_id", providerSessionId);
  if (updateError) throw new Rc1ProviderError("Provider session state could not be retained.", 500, "session_persistence_failed");
  return {
    ok: true,
    provider: "hopae_connect",
    providerSessionId,
    status: nextStatus,
    expiresAt: retrieved.expiresAt ?? data.expires_at,
    updatedAt: retrieved.updatedAt ?? data.updated_at,
    correlationId: data.correlation_id,
    trustSessionId: data.workflow_id,
  };
}

export async function processHopaeProviderCallback(rawBody: string, signature: string, receivedAt = new Date()) {
  const callbackStarted = Date.now();
  const intakeCorrelationId = crypto.randomUUID();
  let adapter;
  let verifiedCallback;
  try {
    adapter = getSelectedProviderAdapter(intakeCorrelationId);
    verifiedCallback = await adapter.verifyCallback({ rawBody, signature, receivedAt, correlationId: intakeCorrelationId });
  } catch (error) {
    if (error instanceof ProviderError) {
      const code = error.code === "CALLBACK_SIGNATURE_INVALID" ? "forged_callback" : error.code === "CALLBACK_TIMESTAMP_INVALID" ? "stale_callback" : error.code.toLowerCase();
      const reasonCode = error.code === "CALLBACK_SIGNATURE_INVALID" ? "HOPAE_SIGNATURE_INVALID" : error.code === "CALLBACK_TIMESTAMP_INVALID" ? "HOPAE_SIGNATURE_EXPIRED" : "HOPAE_PROVIDER_ERROR";
      throw new Rc1ProviderError(error.safeMessage, error.httpStatus, code, reasonCode);
    }
    throw error;
  }
  const callbackData = verifiedCallback.payload.data && typeof verifiedCallback.payload.data === "object" && !Array.isArray(verifiedCallback.payload.data)
    ? verifiedCallback.payload.data as Record<string, unknown> : {};
  const callbackEvent = callbackData.event && typeof callbackData.event === "object" && !Array.isArray(callbackData.event)
    ? callbackData.event as Record<string, unknown> : {};
  const callbackMetadata = callbackEvent.metadata && typeof callbackEvent.metadata === "object" && !Array.isArray(callbackEvent.metadata)
    ? callbackEvent.metadata as Record<string, unknown> : {};
  const envelope = {
    eventId: verifiedCallback.eventId,
    eventType: verifiedCallback.eventType,
    verificationId: verifiedCallback.providerSessionId,
    tenantId: typeof callbackMetadata.tenantId === "string" ? callbackMetadata.tenantId : null,
    workflowId: typeof callbackMetadata.workflowId === "string" ? callbackMetadata.workflowId : null,
    correlationId: typeof callbackMetadata.correlationId === "string" ? callbackMetadata.correlationId : null,
  };
  const signatureTimestamp = verifiedCallback.signatureTimestamp;

  const admin = createServiceRoleClient();
  const intake = await reserveWebhookEvent({ provider: "hopae_connect", eventId: envelope.eventId, eventType: envelope.eventType, rawBody, tenantId: envelope.tenantId, workflowId: envelope.workflowId, correlationId: envelope.correlationId });
  if (!intake.reserved) return { ok: true, duplicate: true, eventId: envelope.eventId, outcome: "ignored_idempotently", reasonCode: "HOPAE_DUPLICATE_EVENT", duplicateOf: intake.duplicateOf };
  const registryResult = await admin.from("provider_registry").select("enabled").eq("provider_id", adapter.id).maybeSingle();
  if (registryResult.error || registryResult.data?.enabled !== true) {
    await completeWebhookEvent("hopae_connect", envelope.eventId, "processed", "provider_disabled");
    return { ok: true, duplicate: false, eventId: envelope.eventId, outcome: "ignored_provider_disabled", reasonCode: "HOPAE_PROVIDER_ERROR" };
  }
  const callbackDatabaseStarted = Date.now();
  const duplicate = await admin.from("hopae_webhook_events").select("id").eq("event_id", envelope.eventId).maybeSingle();
  if (duplicate.data) {
    await admin.from("hopae_webhook_events").update({ duplicate_status: true }).eq("event_id", envelope.eventId);
    return { ok: true, duplicate: true, eventId: envelope.eventId, outcome: "ignored_idempotently", reasonCode: "HOPAE_DUPLICATE_EVENT" };
  }
  const sessionResult = await admin.from("hopae_verifications").select("*").eq("verification_id", envelope.verificationId).maybeSingle();
  if (sessionResult.error || !sessionResult.data) throw new Rc1ProviderError("Provider callback references an unknown workflow.", 404, "unknown_workflow");
  const session = sessionResult.data as Record<string, any>;
  const completedTransaction = await admin.from("provider_execution_records")
    .select("execution_id")
    .eq("provider_id", "hopae_connect")
    .eq("provider_session_id", envelope.verificationId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();
  if (completedTransaction.error) throw new Rc1ProviderError("Provider transaction state could not be checked.", 503, "provider_transaction_check_failed");
  if (completedTransaction.data) {
    await completeWebhookEvent("hopae_connect", envelope.eventId, "processed", "duplicate_transaction");
    return { ok: true, duplicate: true, eventId: envelope.eventId, outcome: "ignored_duplicate_transaction", reasonCode: "HOPAE_DUPLICATE_TRANSACTION", duplicateOf: completedTransaction.data.execution_id };
  }
  recordRuntimeProfile({ stage: "database_query_latency", latencyMs: Date.now() - callbackDatabaseStarted, ok: true, degraded: false, metadata: { correlationId: session.correlation_id, tenantId: session.workspace_id, provider: "hopae_connect", workflowType: session.requested_purpose } });
  let currentPolicy: Record<string, any> | null = null;
  if (session.policy_id) {
    const policyResult = await admin
      .from("governance_policies")
      .select("id,allowed_actions,allowed_purposes,minimum_evidence,authority_expires_at,authority_revoked")
      .eq("id", session.policy_id)
      .eq("workspace_id", session.workspace_id)
      .maybeSingle();
    if (policyResult.error) throw new Rc1ProviderError("Workflow policy could not be revalidated.", 503, "policy_unavailable");
    currentPolicy = policyResult.data as Record<string, any> | null;
  }
  const currentAllowedActions = textArray(currentPolicy?.allowed_actions);
  const currentAllowedPurposes = textArray(currentPolicy?.allowed_purposes);
  const authorityExpired = Boolean(currentPolicy?.authority_expires_at) && Date.parse(String(currentPolicy?.authority_expires_at)) <= receivedAt.getTime();
  const delegationValid = Boolean(currentPolicy) && currentPolicy?.authority_revoked !== true && !authorityExpired;
  const contextMismatch = Boolean(
    (envelope.tenantId && envelope.tenantId !== session.workspace_id) ||
    (envelope.workflowId && envelope.workflowId !== session.workflow_id) ||
    (envelope.correlationId && envelope.correlationId !== session.correlation_id)
  );

  const providerStarted = Date.now();
  let normalizedIdentityEvidence;
  try {
    normalizedIdentityEvidence = await adapter.normalizeEvidence(verifiedCallback, {
      tenantId: session.workspace_id,
      actorId: session.owner_user_id,
      trustSessionId: session.workflow_id,
      correlationId: session.correlation_id,
    });
  } catch (error) {
    const timeout = error instanceof ProviderError ? error.code === "PROVIDER_TIMEOUT" : error instanceof Error && /timed out/i.test(error.message);
    recordRuntimeProfile({ stage: "provider_latency", latencyMs: Date.now() - providerStarted, ok: false, degraded: true, metadata: { provider: "hopae_connect", timeout } });
    if (error instanceof ProviderError) throw new Rc1ProviderError(error.safeMessage, error.httpStatus, error.code.toLowerCase());
    throw new Rc1ProviderError(timeout ? "Provider status request timed out safely." : "Provider status is unavailable.", 503, timeout ? "provider_timeout" : "provider_unavailable");
  }
  const latencyMs = Date.now() - providerStarted;
  const sourceMode = session.source_mode === "live" ? "live" : "test";
  const identityEvidence = normalizedIdentityEvidence[0];
  if (!identityEvidence) throw new Rc1ProviderError("Provider evidence could not be normalized.", 422, "normalization_failed");
  const evidence = normalizeHopaeProviderEvidence({
    statusPayload: { status: identityEvidence.attributes.providerStatus },
    userInfo: {
      hopae_loa: identityEvidence.assuranceLevel,
      provider_id: identityEvidence.attributes.providerId,
      verification_model: identityEvidence.attributes.verificationModel,
      provenance: identityEvidence.attributes.provenanceReported ? { reported: true } : {},
    },
    providerReference: envelope.verificationId,
    correlationId: session.correlation_id,
    tenantId: session.workspace_id,
    workflowId: session.workflow_id,
    sourceMode,
    runtimeState: sourceMode === "live" ? "Live" : "Test Mode",
    receivedAt: receivedAt.toISOString(),
    latencyMs,
  });
  const evidenceQuality = evaluateProviderEvidenceQuality({
    evidence,
    expectedTenantId: contextMismatch ? "context-mismatch" : session.workspace_id,
    expectedWorkflowId: session.workflow_id,
    expectedCorrelationId: session.correlation_id,
    duplicateEvent: false,
    restrictedDataDetected: containsRestrictedProviderData(evidence),
    nowMs: receivedAt.getTime(),
  });
  const assessment = executeCanonicalTrustAssessment({
    tenantId: session.workspace_id,
    workflowId: session.workflow_id,
    entityId: session.entity_id ?? session.owner_user_id,
    entityType: session.entity_type ?? "human",
    requestedAction: session.requested_action,
    requestedPurpose: session.requested_purpose,
    correlationId: session.correlation_id,
    nonce: session.nonce_hash,
    owner: session.workspace_id,
    accountableActor: session.owner_user_id,
    allowedActions: currentAllowedActions,
    allowedPurposes: currentAllowedPurposes,
    delegationValid,
    authorityExpiresAt: currentPolicy?.authority_expires_at,
    authorityRevoked: currentPolicy?.authority_revoked === true,
    policyVersion: session.policy_version,
    minimumEvidence: Number(currentPolicy?.minimum_evidence ?? session.minimum_evidence ?? 1),
    evidence,
    evidenceQuality,
    createdAt: receivedAt.toISOString(),
  });

  const persistence = await admin.rpc("persist_provider_identity_evidence", {
    verification_row_id: session.id,
    provider_event_id: envelope.eventId,
    provider_event_type: envelope.eventType,
    provider_verification_id: envelope.verificationId,
    provider_signature_timestamp: signatureTimestamp,
    provider_event_digest: verifiedCallback.sourceDigest,
    normalized_identity_evidence_input: identityEvidence,
    normalized_evidence_input: evidence,
    evidence_quality_input: evidenceQuality,
    assessment_input: assessment,
    evidence_pack_input: assessment.trust_evidence_pack,
  });
  if (persistence.error || !persistence.data) {
    throw new Rc1ProviderError("The evidence trail could not be committed atomically; execution remains blocked.", 500, "evidence_commit_failed");
  }
  const references = persistence.data as Record<string, unknown>;
  if (references.duplicate === true) {
    await admin.from("hopae_webhook_events").update({ duplicate_status: true }).eq("event_id", envelope.eventId);
    return { ok: true, duplicate: true, eventId: envelope.eventId, outcome: "ignored_idempotently", reasonCode: "HOPAE_DUPLICATE_EVENT" };
  }
  const replayReference = String(references.replay_reference ?? "");
  const evidenceGraphReference = String(references.evidence_graph_reference ?? "");
  const trustMemoryReference = String(references.trust_memory_reference ?? "");
  const receiptReference = String(references.receipt_reference ?? "");
  const storedPack = {
    ...assessment.trust_evidence_pack,
    replay: { ...assessment.trust_evidence_pack.replay, reference: replayReference },
    evidenceGraph: { reference: evidenceGraphReference },
    trustMemory: { ...assessment.trust_evidence_pack.trustMemory, references: [trustMemoryReference] },
    enforcement: { ...assessment.trust_evidence_pack.enforcement, receiptReference },
  };
  const { error: executionUpdateError } = await admin.from("provider_execution_records").update({
    runtime_mode: sourceMode === "live" ? "Live" : "Test",
    callback_received_at: receivedAt.toISOString(),
    signature_status: "verified",
    idempotency_status: "unique",
    normalized_evidence_reference: `provider-evidence:${envelope.eventId}`,
    evidence_quality_status: evidenceQuality.status,
    decision_reference: `decision:${session.correlation_id}`,
    replay_reference: replayReference,
    evidence_graph_reference: evidenceGraphReference,
    trust_memory_reference: trustMemoryReference,
    latency_ms: latencyMs,
    status: "completed",
    limitations: evidence.limitations,
    updated_at: receivedAt.toISOString(),
  }).eq("correlation_id", session.correlation_id);
  if (executionUpdateError) throw new Rc1ProviderError("Provider execution record could not be completed.", 500, "execution_record_update_failed");
  const healthRecordedAt = new Date().toISOString();
  await Promise.all([
    admin.from("provider_registry").update({
      environment: adapter.environment,
      health_status: "HEALTHY",
      last_successful_call: healthRecordedAt,
      updated_at: healthRecordedAt,
    }).eq("provider_id", adapter.id),
    admin.from("provider_health_snapshots").insert([
      { provider_id: adapter.id, environment: adapter.environment, health_status: "HEALTHY", health_dimension: "callback", reason: "Signed callback verified within tolerance.", latency_ms: Date.now() - callbackStarted },
      { provider_id: adapter.id, environment: adapter.environment, health_status: "HEALTHY", health_dimension: "evidence_pipeline", reason: "Normalized evidence and authoritative trust references committed atomically.", latency_ms: Date.now() - callbackStarted },
    ]),
  ]).catch((error) => console.warn("Provider health evidence could not be retained.", { provider: adapter.id, correlationId: session.correlation_id, message: error instanceof Error ? error.message : "unknown" }));
  await completeWebhookEvent("hopae_connect", envelope.eventId, "processed");
  recordRuntimeProfile({ stage: "provider_callback_latency", latencyMs: Date.now() - callbackStarted, ok: true, degraded: sourceMode !== "live", metadata: { correlationId: session.correlation_id, tenantId: session.workspace_id, provider: "hopae_connect", workflowType: session.requested_purpose } });

  return {
    ok: true,
    duplicate: false,
    reasonCode: "HOPAE_SIGNED_ASSERTION_VALID",
    eventId: envelope.eventId,
    correlationId: session.correlation_id,
    decision: assessment.trust_decision,
    enforcement: assessment.enforcement_action,
    evidenceQuality,
    continuity: { ...assessment.continuity, replayReference, evidenceGraphReference, trustMemoryReference, receiptReference },
    trustEvidencePack: storedPack,
  };
}
