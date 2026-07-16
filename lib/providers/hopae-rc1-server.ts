import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  createHopaeVerification,
  getHopaeConfig,
  getHopaeVerificationStatus,
  getHopaeVerificationUserInfo,
  type HopaeJson,
} from "@/lib/hopae";
import { executeCanonicalTrustAssessment } from "@/lib/core/trust-lifecycle-orchestrator";
import { recordRuntimeProfile } from "@/lib/performance/runtime-profiler";
import {
  containsRestrictedProviderData,
  digestProviderEvent,
  evaluateProviderEvidenceQuality,
  getHopaeWebhookTimestamp,
  normalizeHopaeProviderEvidence,
  safeHopaeWebhookEnvelope,
  verifyHopaeWebhookSignature,
  webhookTimestampWithinTolerance,
} from "@/lib/providers/hopae-rc1";
import { hashValue } from "@/lib/security";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[a-zA-Z0-9_.:-]{1,120}$/;

export class Rc1ProviderError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
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

function providerReference(payload: HopaeJson) {
  const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? payload.data as HopaeJson : payload;
  for (const key of ["verificationId", "verification_id", "id"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
  }
  return null;
}

function providerRedirect(payload: HopaeJson) {
  const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? payload.data as HopaeJson : payload;
  for (const key of ["redirectUrl", "redirect_url", "verificationUrl", "verification_url", "url"]) {
    if (typeof data[key] === "string" && /^https:\/\//i.test(data[key])) return data[key];
  }
  return null;
}

export async function startHopaeTrustAssessment(input: {
  supabase: SupabaseClient;
  user: User;
  body: Record<string, unknown>;
  appUrl: string;
}) {
  const config = getHopaeConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret || !config.webhookSecret) {
    throw new Rc1ProviderError("Hopae Connect is awaiting credentials.", 503, "provider_awaiting_credentials");
  }
  const workspaceId = requiredReference(input.body.tenant_id ?? input.body.workspace_id, "tenant_id", true);
  const workflowId = requiredReference(input.body.workflow_id, "workflow_id", true);
  const requestedAction = requiredReference(input.body.requested_action, "requested_action");
  const requestedPurpose = requiredReference(input.body.requested_purpose, "requested_purpose");
  const hopaeProviderId = requiredReference(input.body.hopae_provider_id ?? "hopae-connect", "hopae_provider_id");
  const entityId = input.body.entity_id ? requiredReference(input.body.entity_id, "entity_id", true) : input.user.id;

  const [workspaceResult, workflowResult, policiesResult] = await Promise.all([
    input.supabase.from("trust_workspaces").select("id,name,created_by").eq("id", workspaceId).maybeSingle(),
    input.supabase.from("trust_cases").select("id,workspace_id,status,created_by").eq("id", workflowId).eq("workspace_id", workspaceId).maybeSingle(),
    input.supabase.from("governance_policies").select("id,name,trigger_type,action_type,requires_human_review,allowed_actions,allowed_purposes,minimum_evidence,authority_expires_at,authority_revoked").eq("workspace_id", workspaceId).limit(100),
  ]);
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
  const correlationId = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const redirectUri = new URL("/demo/trust-execution-flow", input.appUrl).toString();
  const providerStarted = Date.now();
  let created: HopaeJson;
  try {
    created = await createHopaeVerification({
      providerId: hopaeProviderId,
      redirectUri,
      matchData: {},
      metadata: { correlationId, workflowId },
    });
  } catch (error) {
    const timeout = error instanceof Error && /timed out/i.test(error.message);
    recordRuntimeProfile({ stage: "provider_latency", latencyMs: Date.now() - providerStarted, ok: false, degraded: true, metadata: { provider: "hopae_connect", timeout } });
    throw new Rc1ProviderError(timeout ? "Hopae Connect timed out safely." : "Hopae Connect is unavailable.", 503, timeout ? "provider_timeout" : "provider_unavailable");
  }
  const verificationId = providerReference(created);
  if (!verificationId) throw new Rc1ProviderError("Hopae Connect did not return a provider reference.", 502, "missing_provider_reference");
  const runtimeState = config.environment === "production" ? "Live" : "Test Mode";
  const sourceMode = config.environment === "production" ? "live" : "test";
  recordRuntimeProfile({ stage: "provider_latency", latencyMs: Date.now() - providerStarted, ok: true, degraded: config.environment !== "production", metadata: { provider: "hopae_connect", source_mode: config.environment === "production" ? "live" : "test" } });

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
  if (error) throw new Rc1ProviderError("Trust assessment session could not be retained.", 500, "session_persistence_failed");

  return {
    ok: true,
    action: "Establish Trust",
    assessmentStatus: "provider_evidence_pending",
    provider: { id: "hopae_connect", name: "Hopae Connect", runtimeState, sourceMode },
    providerReference: verificationId,
    providerRedirect: providerRedirect(created),
    correlationId,
    tenantId: workspaceId,
    workflowId,
    policy: { reference: matchingPolicy ? `governance-policy:${matchingPolicy.id}` : "policy:not-configured", delegationValid },
    limitation: delegationValid ? "Identity evidence remains subject to authority and policy at callback time." : "No current, non-revoked workflow policy grants this action and purpose; the provider result cannot authorize it.",
  };
}

export async function processHopaeProviderCallback(rawBody: string, signature: string, receivedAt = new Date()) {
  const config = getHopaeConfig();
  if (!config.enabled || !config.webhookSecret) throw new Rc1ProviderError("Hopae Connect callback is not configured.", 503, "provider_awaiting_credentials");
  if (!verifyHopaeWebhookSignature(rawBody, signature, config.webhookSecret)) throw new Rc1ProviderError("Provider signature is invalid.", 401, "forged_callback");
  const signatureTimestamp = getHopaeWebhookTimestamp(signature);
  if (!webhookTimestampWithinTolerance(signatureTimestamp, receivedAt.getTime())) throw new Rc1ProviderError("Provider callback timestamp is stale.", 401, "stale_callback");
  let payload: HopaeJson;
  try { payload = JSON.parse(rawBody) as HopaeJson; } catch { throw new Rc1ProviderError("Provider callback body is invalid.", 400, "invalid_callback_body"); }
  const envelope = safeHopaeWebhookEnvelope(payload);
  if (!envelope.eventId || !envelope.verificationId) throw new Rc1ProviderError("Provider callback lacks an event or verification reference.", 400, "invalid_callback_reference");

  const admin = createServiceRoleClient();
  const duplicate = await admin.from("hopae_webhook_events").select("id").eq("event_id", envelope.eventId).maybeSingle();
  if (duplicate.data) return { ok: true, duplicate: true, eventId: envelope.eventId, outcome: "ignored_idempotently" };
  const sessionResult = await admin.from("hopae_verifications").select("*").eq("verification_id", envelope.verificationId).maybeSingle();
  if (sessionResult.error || !sessionResult.data) throw new Rc1ProviderError("Provider callback references an unknown workflow.", 404, "unknown_workflow");
  const session = sessionResult.data as Record<string, any>;
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
  let statusPayload: HopaeJson;
  let userInfo: HopaeJson;
  try {
    [statusPayload, userInfo] = await Promise.all([
      getHopaeVerificationStatus(envelope.verificationId),
      getHopaeVerificationUserInfo(envelope.verificationId),
    ]);
  } catch (error) {
    const timeout = error instanceof Error && /timed out/i.test(error.message);
    recordRuntimeProfile({ stage: "provider_latency", latencyMs: Date.now() - providerStarted, ok: false, degraded: true, metadata: { provider: "hopae_connect", timeout } });
    throw new Rc1ProviderError(timeout ? "Provider status request timed out safely." : "Provider status is unavailable.", 503, timeout ? "provider_timeout" : "provider_unavailable");
  }
  const latencyMs = Date.now() - providerStarted;
  const sourceMode = session.source_mode === "live" ? "live" : "test";
  const evidence = normalizeHopaeProviderEvidence({
    statusPayload,
    userInfo,
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

  const persistence = await admin.rpc("persist_rc1_trust_assessment", {
    verification_row_id: session.id,
    provider_event_id: envelope.eventId,
    provider_event_type: envelope.eventType,
    provider_verification_id: envelope.verificationId,
    provider_signature_timestamp: signatureTimestamp,
    provider_event_digest: digestProviderEvent(rawBody),
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
    return { ok: true, duplicate: true, eventId: envelope.eventId, outcome: "ignored_idempotently" };
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

  return {
    ok: true,
    duplicate: false,
    eventId: envelope.eventId,
    correlationId: session.correlation_id,
    decision: assessment.trust_decision,
    enforcement: assessment.enforcement_action,
    evidenceQuality,
    continuity: { ...assessment.continuity, replayReference, evidenceGraphReference, trustMemoryReference, receiptReference },
    trustEvidencePack: storedPack,
  };
}
