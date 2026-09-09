import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CONTROL_PLANE_PROVENANCE, ControlPlaneError, eligibleControlPlaneEvidence, persistControlPlaneHeartbeat, type ControlPlaneContext, type ControlPlaneSnapshot } from "@/lib/operational-entities/control-plane-evidence";
import type { PublicApiPrincipal } from "./authentication";
import { PublicApiError } from "./contracts";
import { publicApiEnvironmentMetadata, stagingControlPlaneQualificationEnabled } from "./environment";

function unavailable(): never {
  throw new PublicApiError("CONTROL_PLANE_UNAVAILABLE", "Control-plane evidence could not be verified or persisted safely.", 503);
}
export function productionControlPlaneContext(tenantId: string, agentId: string, policyId: string, policyVersion: string): ControlPlaneContext | null {
  const environment = publicApiEnvironmentMetadata();
  if (!environment.valid || (environment.name !== "production" && !stagingControlPlaneQualificationEnabled())) return null;
  return { tenantId, agentId, policyId, policyVersion, environment: environment.name, audience: `${environment.origin}/api/v1` };
}
async function loadSnapshot(context: ControlPlaneContext): Promise<ControlPlaneSnapshot> {
  const db = createServiceRoleClient();
  const { tenantId, agentId, policyId, policyVersion } = context;
  const results = await Promise.all([
    db.from("operational_entities").select("*").eq("enterprise_id", tenantId).eq("entity_id", agentId).maybeSingle(),
    db.from("operational_entity_manifests").select("*").eq("enterprise_id", tenantId).eq("operational_entity_id", agentId).eq("status", "ACTIVE").order("issued_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("operational_entity_native_credentials").select("*").eq("enterprise_id", tenantId).eq("operational_entity_id", agentId).eq("state", "ACTIVE").order("valid_from", { ascending: false }).limit(1).maybeSingle(),
    db.from("operational_entity_native_verifications").select("*").eq("enterprise_id", tenantId).eq("operational_entity_id", agentId).order("verified_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("native_entity_identity_evidence").select("*").eq("enterprise_id", tenantId).eq("operational_entity_id", agentId).order("verified_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("trust_contracts").select("*").eq("enterprise_id", tenantId).eq("subject_type", "ai_agent").eq("subject_id", agentId).order("issued_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("trust_policy_versions").select("*").eq("enterprise_id", tenantId).eq("policy_id", policyId).eq("version", policyVersion).maybeSingle(),
  ]);
  if (results.some(result => result.error)) unavailable();
  const [entity, manifest, credential, verification, identityEvidence, authority, policy] = results.map(result => result.data);
  return { entity, manifest, credential, verification, identityEvidence, authority, policy } as ControlPlaneSnapshot;
}
export async function ingestControlPlaneHeartbeat(principal: PublicApiPrincipal, agentId: string, body: Record<string, unknown>, requestAudience: string) {
  const context = productionControlPlaneContext(principal.tenantId, agentId, "external-agent-trust-v1", "0.2.0");
  if (!context || context.audience !== requestAudience) throw new PublicApiError("HEARTBEAT_ENVIRONMENT_MISMATCH", "The heartbeat requires the configured Production audience.", 409);
  const db = createServiceRoleClient();
  const binding = await db.from("public_api_agent_bindings").select("operational_entity_id").eq("tenant_id", principal.tenantId).eq("client_id", principal.clientId).eq("operational_entity_id", agentId).maybeSingle();
  if (binding.error) unavailable();
  if (!binding.data) throw new PublicApiError("AGENT_NOT_FOUND", "The agent is not bound to this API client.", 404);
  try {
    // A single PostgREST array insert is one transaction. Unique evidence IDs
    // reject every replay; neither half of the pair can persist on a conflict.
    const records = await persistControlPlaneHeartbeat(await loadSnapshot(context), context, body, async records => db.from("evidence_objects").insert(records));
    return { agent_id: agentId, event_id: body.event_id, provenance: CONTROL_PLANE_PROVENANCE,
      observed_at: records[0].observed_at, expires_at: records[0].expires_at,
      evidence_references: records.map(record => record.evidence_id), evidence_types: records.map(record => record.evidence_type),
      monitoring_scope: "SIGNED_CONTROL_PLANE_HEARTBEAT_ONLY", downstream_execution_observed: false };
  } catch (error) {
    if (error instanceof ControlPlaneError && error.code === "CONTROL_PLANE_PERSISTENCE_FAILED") unavailable();
    if (error instanceof ControlPlaneError) throw new PublicApiError(error.code, "The heartbeat or current control-plane baseline did not verify.", 409);
    throw error;
  }
}

export async function currentControlPlaneEvidence(context: ControlPlaneContext | null) {
  if (!context) return new Set<string>();
  const snapshot = await loadSnapshot(context);
  const now = Date.now();
  const result = await createServiceRoleClient().from("evidence_objects")
    .select("evidence_id,evidence_type,normalized_facts,payload_hash,expires_at,server_verified,provider_key")
    .eq("enterprise_id", context.tenantId).eq("subject_id", context.agentId)
    .eq("source_type", CONTROL_PLANE_PROVENANCE).gt("expires_at", new Date(now).toISOString())
    .order("occurred_at", { ascending: false }).limit(50);
  if (result.error) unavailable();
  return eligibleControlPlaneEvidence(snapshot, context, result.data ?? [], now);
}
