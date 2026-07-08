import { evaluateAgentRuntimeControl, type AgentRuntimeControlInput } from "@/lib/agents/agent-runtime-control";
import { evaluateRuntimeTrust, type RuntimeTrustInput } from "@/lib/runtime/runtime-trust-engine";
import { runTrustExecutionPipeline, type TrustExecutionPipelineInput } from "@/lib/runtime/trust-execution-pipeline";
import { evaluateIntentRisk, type IntentRiskInput } from "@/lib/trust/intent-risk";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RuntimeEngineInput = {
  session?: RuntimeTrustInput;
  agent?: AgentRuntimeControlInput;
  intent?: IntentRiskInput;
};

export function evaluateRuntime(input: RuntimeEngineInput) {
  const session = input.session ? evaluateRuntimeTrust(input.session) : null;
  const agent = input.agent ? evaluateAgentRuntimeControl(input.agent) : null;
  const intent = input.intent ? evaluateIntentRisk(input.intent) : null;
  const runtimeRiskEvents = [
    ...(session?.weightedSignals.map((signal) => signal.key) ?? []),
    ...(agent?.suspicious_behavior_events.map((event) => event.type) ?? []),
    ...(intent?.evidence ?? []),
  ];

  return {
    engine: "runtime_engine" as const,
    session,
    agent,
    intent,
    runtimeRiskEvents: [...new Set(runtimeRiskEvents)],
    source_labels: ["Heuristic Baseline", "Runtime Intelligence"] as const,
    limitations: [
      "Runtime Engine aggregates deterministic session, agent, NHI, device, behavior and intent signals.",
      "Runtime risk events support governance review and do not claim autonomous detection certainty.",
    ],
  };
}

export function executeRuntimeWorkflow(
  supabase: SupabaseClient,
  input: TrustExecutionPipelineInput
) {
  return runTrustExecutionPipeline(supabase, input);
}

export const runtimeEngine = {
  evaluateRuntime,
  executeRuntimeWorkflow,
};
