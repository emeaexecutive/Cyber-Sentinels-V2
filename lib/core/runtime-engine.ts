import { evaluateAgentRuntimeControl, type AgentRuntimeControlInput } from "@/lib/agents/agent-runtime-control";
import { normalizeEntityIdentity, type EntityIdentityInput } from "@/lib/core/entity-identity";
import { evaluateRuntimeTrust, type RuntimeTrustInput } from "@/lib/runtime/runtime-trust-engine";
import { runTrustExecutionPipeline, type TrustExecutionPipelineInput } from "@/lib/runtime/trust-execution-pipeline";
import { evaluateIntentRisk, type IntentRiskInput } from "@/lib/trust/intent-risk";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RuntimeEngineInput = {
  session?: RuntimeTrustInput;
  agent?: AgentRuntimeControlInput;
  intent?: IntentRiskInput;
  entity?: EntityIdentityInput;
};

export function evaluateRuntime(input: RuntimeEngineInput) {
  const entity = input.entity ? normalizeEntityIdentity(input.entity) : null;
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
    entity_identity: entity,
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
  input: TrustExecutionPipelineInput,
  context?: { entity?: EntityIdentityInput }
) {
  const entity = context?.entity ? normalizeEntityIdentity(context.entity) : null;
  return runTrustExecutionPipeline(supabase, input).then((result) => ({
    ...result,
    entity_identity: entity,
  }));
}

export const runtimeEngine = {
  evaluateRuntime,
  executeRuntimeWorkflow,
};
