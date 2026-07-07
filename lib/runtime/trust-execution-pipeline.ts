import type { SupabaseClient } from "@supabase/supabase-js";
import { fuseTrustSignals } from "@/lib/detection/signal-fusion";
import { publishTrustEvent } from "@/lib/events/event-bus";
import { enqueueGovernanceJob } from "@/lib/governance/governance-queue";
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
  const posture = updateRuntimeTrustPosture({
    subjectId: input.workflowId,
    trustScore: algorithm.trust_score,
    decision: algorithm.decision,
    evidenceRefs: algorithm.evidence_refs,
  });
  setTrustCache("provider_state", input.workflowId, signalRunner.providerResults, { ttlMs: 45_000 });
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
  if (algorithm.decision === "review" || algorithm.decision === "step_up" || algorithm.decision === "escalate" || algorithm.decision === "block") {
    enqueueGovernanceJob({
      queue: algorithm.decision === "escalate" || algorithm.decision === "block" ? "escalation" : "review",
      subject_id: input.workflowId,
      decision: algorithm.decision,
      reason: algorithm.next_action,
      evidence_refs: algorithm.evidence_refs,
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
    signal_runner: signalRunner,
    fusion,
    algorithm,
    posture,
    execution,
  };
}
