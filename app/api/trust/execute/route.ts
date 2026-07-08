import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runtimeEngine } from "@/lib/core/runtime-engine";

export const dynamic = "force-dynamic";

function numberValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_execution_input" }, { status: 400 });

  const workflowId = String(body.workflow_id ?? crypto.randomUUID()).slice(0, 120);
  const actorId = String(body.actor_id ?? user.id).slice(0, 120);
  const actorType = ["human", "agent", "NHI", "workflow"].includes(String(body.actor_type))
    ? (String(body.actor_type) as "human" | "agent" | "NHI" | "workflow")
    : "workflow";
  const evidenceRefs = Array.isArray(body.evidence_refs) ? body.evidence_refs.map(String).slice(0, 20) : [];
  const pipeline = await runtimeEngine.executeRuntimeWorkflow(supabase, {
    actorId,
    actorType,
    workflowId,
    subjectType: String(body.subject_type ?? "workflow"),
    reviewerActor: user.email ?? user.id,
    timeoutMs: numberValue(body, "timeout_ms") ?? 300,
    identityConfidence: numberValue(body, "identity_confidence"),
    proofOfHuman: body.proof_of_human === "verified" || body.proof_of_human === "failed" ? body.proof_of_human : "unknown",
    agentIdentity: body.agent_identity === "verified" ? "verified" : body.agent_identity === "unverified" ? "unverified" : "unknown",
    nhiOwnership: body.nhi_ownership === "known" || body.nhi_ownership === "orphaned" ? body.nhi_ownership : "unknown",
    sessionIntegrity: numberValue(body, "session_integrity"),
    injectionRisk: numberValue(body, "injection_risk"),
    deviceChannelIntegrity: numberValue(body, "device_channel_integrity"),
    provenanceConfidence: numberValue(body, "provenance_confidence"),
    documentRisk: numberValue(body, "document_risk"),
    intentRisk: numberValue(body, "intent_risk"),
    runtimeBehavior: numberValue(body, "runtime_behavior"),
    providerSignals: numberValue(body, "provider_signals"),
    heuristicBaseline: numberValue(body, "heuristic_baseline"),
    previousTrustPosture: String(body.previous_trust_posture ?? "fresh") as any,
    governanceHistory: [],
    evidenceRefs,
    evidenceLastSeenAt: typeof body.evidence_last_seen_at === "string" ? body.evidence_last_seen_at : null,
  });

  return NextResponse.json(pipeline, { headers: { "cache-control": "no-store" } });
}
