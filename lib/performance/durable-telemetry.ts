import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { RuntimeProfileSample } from "./runtime-profiler";

function safeReference(value: unknown, fallback: string) {
  const normalized = String(value ?? "").replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 160);
  return normalized || fallback;
}

const durableStageMap: Record<string, string> = {
  lifecycle_orchestration_latency: "trust_session_creation",
  authorization_latency: "authority_evaluation",
  provider_latency: "provider_request",
  provider_callback_latency: "provider_callback",
  provider_normalization_latency: "evidence_normalization",
  consensus_latency: "evidence_quality",
  trust_latency: "trust_decision",
  enforcement_latency: "enforcement",
  replay_latency: "replay_write",
  evidence_graph_latency: "evidence_graph_write",
  trust_memory_latency: "trust_memory_write",
  evidence_pack_latency: "evidence_pack_generation",
  database_query_latency: "database_query",
  queue_latency: "queue_wait",
  governance_queue_latency: "queue_wait",
  workflow_latency: "end_to_end",
};

export async function retainRuntimeProfileSample(sample: RuntimeProfileSample) {
  const metadata = sample.metadata ?? {};
  const tenantCandidate = safeReference(metadata.tenantId, "");
  const tenantId = /^[0-9a-f-]{36}$/i.test(tenantCandidate) ? tenantCandidate : null;
  const { error } = await createServiceRoleClient().from("operational_measurements").insert({
    tenant_id: tenantId,
    correlation_id: safeReference(metadata.correlationId, "unscoped"),
    workflow_type: safeReference(metadata.workflowType, "trust_assessment"),
    stage: durableStageMap[sample.stage] ?? sample.stage,
    duration_ms: sample.latencyMs,
    status: sample.ok ? (sample.degraded ? "degraded" : "ok") : "failed",
    timeout: metadata.timeout === true,
    retry_count: Number.isInteger(metadata.retryCount) ? Number(metadata.retryCount) : 0,
    provider_id: metadata.provider ? safeReference(metadata.provider, "unknown") : null,
    environment: safeReference(process.env.VERCEL_ENV ?? process.env.NODE_ENV, "unknown"),
    build_version: safeReference(process.env.VERCEL_GIT_COMMIT_SHA, "local-unversioned"),
    operation_fingerprint: `${durableStageMap[sample.stage] ?? sample.stage}:${safeReference(metadata.label, "default")}`,
    error_category: sample.ok ? null : safeReference(metadata.errorCategory, "operation_failed"),
  });
  if (error) throw error;
}
