import type { SupabaseClient } from "@supabase/supabase-js";
import { fuseTrustSignals } from "@/lib/detection/signal-fusion";
import { publishTrustEvent } from "@/lib/events/event-bus";
import { enqueueGovernanceJob } from "@/lib/governance/governance-queue";
import { recordRuntimeProfile } from "@/lib/performance/runtime-profiler";
import { setTrustCache } from "@/lib/cache/trust-cache";
import { runParallelSignalChecks } from "@/lib/runtime/parallel-signal-runner";
import { updateRuntimeTrustPosture } from "@/lib/runtime/trust-posture-engine";
import { runTrustAlgorithm, type TrustAlgorithmInput } from "@/lib/trust/trust-algorithm";
import { executeTrustWorkflow } from "@/lib/workflows/trust-workflow-executor";

export type TrustExecutionPipelineInput = TrustAlgorithmInput & {
  actorId: string;
  actorType: "human" | "agent" | "NHI" | "workflow";
  workflowId: string;
  subjectType?: string;
  reviewerActor?: string | null;
  timeoutMs?: number;
};

export async function runTrustExecutionPipeline(supabase: SupabaseClient, input: TrustExecutionPipelineInput) {
  const started = Date.now();
  publishTrustEvent("signal.received", { workflow_id: input.workflowId, actor_id: input.actorId }, { replaySafe: true });
  const signalRunner = await runParallelSignalChecks({
    timeoutMs: input.timeoutMs,
    identityConfidence: input.identityConfidence,
    sessionIntegrity: input.sessionIntegrity,
    provenanceConfidence: input.provenanceConfidence,
    intentRisk: input.intentRisk,
    runtimeBehavior: input.runtimeBehavior,
    heuristicBaseline: input.heuristicBaseline,
  });
  recordRuntimeProfile({
    stage: "provider_latency",
    latencyMs: signalRunner.providerResults.length
      ? Math.max(...signalRunner.providerResults.map((provider) => provider.latencyMs ?? provider.latency_ms))
      : Date.now() - started,
    ok: signalRunner.timeoutOrFailedProviders.length === 0,
    degraded: signalRunner.providerResults.some((provider) => provider.state !== "Live"),
    metadata: {
      provider_count: signalRunner.providerResults.length,
      timeout_or_failed: signalRunner.timeoutOrFailedProviders.length,
    },
  });
  const fusion = fuseTrustSignals({
    signals: signalRunner.signals,
    intentRisk: signalRunner.intentRisk,
    sessionIntegrityRisk: signalRunner.sessionIntegrityRisk,
    provenanceConfidence: signalRunner.provenanceConfidence,
    agentPostureRisk: signalRunner.runtimeAnomalyRisk,
    governanceHistory: input.governanceHistory,
  });
  const algorithm = runTrustAlgorithm({
    ...input,
    providerSignals: input.providerSignals ?? signalRunner.partialConfidence,
    heuristicBaseline: input.heuristicBaseline ?? fusion.confidence,
    sourceLabels: [...new Set(["Runtime Intelligence", ...fusion.sources])] as TrustAlgorithmInput["sourceLabels"],
  });
  recordRuntimeProfile({
    stage: "trust_latency",
    latencyMs: Date.now() - started,
    ok: true,
    degraded: algorithm.decision !== "allow",
    metadata: {
      decision: algorithm.decision,
      confidence_band: algorithm.confidence_band,
    },
  });
  const posture = updateRuntimeTrustPosture({
    subjectId: input.workflowId,
    trustScore: algorithm.trust_score,
    decision: algorithm.decision,
    evidenceRefs: algorithm.evidence_refs,
  });
  const providerLatencySummary = {
    timeout_ms: input.timeoutMs ?? 300,
    provider_count: signalRunner.providerResults.length,
    max_latency_ms: signalRunner.providerResults.length
      ? Math.max(...signalRunner.providerResults.map((provider) => provider.latency_ms))
      : 0,
    degraded_count: signalRunner.providerResults.filter((provider) => provider.state !== "Live").length,
    states: [...new Set(signalRunner.providerResults.map((provider) => provider.state))],
    timeout_or_failed: signalRunner.timeoutOrFailedProviders,
  };
  setTrustCache("provider_state", input.workflowId, {
    providers: signalRunner.providerResults,
    latency_summary: providerLatencySummary,
    written_at: new Date().toISOString(),
  }, { ttlMs: 45_000 });
  recordRuntimeProfile({
    stage: "cache_efficiency",
    latencyMs: 1,
    ok: true,
    degraded: false,
    metadata: {
      cache_key: "provider_state",
      ttl_ms: 45_000,
    },
  });
  const execution = await executeTrustWorkflow(supabase, {
    actorId: input.actorId,
    actorType: input.actorType,
    workflowId: input.workflowId,
    subjectType: input.subjectType,
    evidenceRefs: input.evidenceRefs,
    algorithm,
    reviewerActor: input.reviewerActor,
    asyncSideEffects: true,
  });
  recordRuntimeProfile({
    stage: "workflow_latency",
    latencyMs: Date.now() - started,
    ok: true,
    degraded: algorithm.decision === "review" || algorithm.decision === "step_up" || algorithm.decision === "escalate" || algorithm.decision === "block",
    metadata: {
      workflow_id: input.workflowId,
      async_side_effects: true,
    },
  });
  recordRuntimeProfile({
    stage: "replay_latency",
    latencyMs: Date.now() - started,
    ok: true,
    degraded: false,
    metadata: {
      async_replay_persistence: true,
      evidence_refs: algorithm.evidence_refs.length,
    },
  });
  if (algorithm.decision === "review" || algorithm.decision === "step_up" || algorithm.decision === "escalate" || algorithm.decision === "block") {
    enqueueGovernanceJob({
      queue: algorithm.decision === "escalate" || algorithm.decision === "block" ? "escalation" : "review",
      subject_id: input.workflowId,
      decision: algorithm.decision,
      reason: algorithm.next_action,
      evidence_refs: algorithm.evidence_refs,
    });
    recordRuntimeProfile({
      stage: "queue_latency",
      latencyMs: 1,
      ok: true,
      degraded: algorithm.decision === "escalate" || algorithm.decision === "block",
      metadata: {
        queue: algorithm.decision === "escalate" || algorithm.decision === "block" ? "escalation" : "review",
        decision: algorithm.decision,
      },
    });
  }
  publishTrustEvent(
    algorithm.decision === "allow"
      ? "workflow.allowed"
      : algorithm.decision === "step_up"
        ? "stepup.required"
        : algorithm.decision === "escalate"
          ? "workflow.escalated"
          : algorithm.decision === "block"
            ? "workflow.blocked"
            : "workflow.review",
    { workflow_id: input.workflowId, decision: algorithm.decision },
    { replaySafe: true }
  );

  return {
    ok: true,
    latency_ms: Date.now() - started,
    pipeline_stages: [
      "Signal Collection",
      "Signal Normalization",
      "Detection Evaluation",
      "Trust Algorithm Calculation",
      "Decision Engine",
      "Workflow Executor",
      "Replay Writer",
      "Governance Hooks",
      "Notification/Event Hooks",
    ],
    partial_provider_availability: signalRunner.providerResults.some((provider) => provider.state !== "Live"),
    provider_latency_summary: providerLatencySummary,
    signal_runner: signalRunner,
    fusion,
    algorithm,
    posture,
    execution,
    performance_profile: {
      profiling: "in_process",
      boundary: "Runtime profile samples are readiness telemetry and not production APM.",
    },
  };
}
