import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { MODEL_APPROVAL_EVIDENCE, MODEL_APPROVAL_SOURCE, resolveModelApproval, type ModelApprovalRow } from "@/lib/trust-fabric/model-approval";

/** No request-supplied approval fields are consulted. Writes remain an operator/service-role operation. */
export async function loadTrustedModelState(input: { enterpriseId: string; agentId: string; environment: string; evaluatedAt: string }) {
  const db = createServiceRoleClient();
  const result = await db.from("evidence_objects").select("enterprise_id,subject_id,evidence_id,evidence_type,provider_key,source_type,source_key,server_verified,payload_hash,normalized_facts,observed_at,expires_at")
    .eq("enterprise_id", input.enterpriseId).eq("subject_id", input.agentId)
    .eq("evidence_type", MODEL_APPROVAL_EVIDENCE).eq("source_type", MODEL_APPROVAL_SOURCE)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error("MODEL_APPROVAL_RESOLUTION_UNAVAILABLE");
  let manifest = null;
  if (result.data) {
    const verification = await db.from("operational_entity_native_verifications").select("manifest_id,manifest_digest,status,expires_at")
      .eq("enterprise_id", input.enterpriseId).eq("operational_entity_id", input.agentId).order("verified_at", { ascending: false }).limit(1).maybeSingle();
    if (verification.error) throw new Error("MODEL_APPROVAL_MANIFEST_UNAVAILABLE");
    if (verification.data && ["VERIFIED", "PARTIALLY_VERIFIED"].includes(verification.data.status) && Date.parse(verification.data.expires_at) > Date.parse(input.evaluatedAt)) {
      const stored = await db.from("operational_entity_manifests").select("manifest,manifest_digest,status")
        .eq("enterprise_id", input.enterpriseId).eq("operational_entity_id", input.agentId).eq("manifest_id", verification.data.manifest_id).maybeSingle();
      if (stored.error) throw new Error("MODEL_APPROVAL_MANIFEST_UNAVAILABLE");
      if (stored.data?.status === "ACTIVE" && stored.data.manifest_digest === verification.data.manifest_digest) {
        const ai = stored.data.manifest?.ai;
        manifest = { digest: stored.data.manifest_digest, modelId: ai?.modelIdentifier ?? null, modelProvider: ai?.modelProvider ?? null, modelVersion: ai?.modelVersion ?? null };
      }
    }
  }
  return resolveModelApproval(result.data as ModelApprovalRow | null, { ...input, manifest });
}
