import { evaluateTrustDecision, type TrustDecision } from "@/lib/trust/decision-engine";
import { evaluateIntentRisk } from "@/lib/trust/intent-risk";
import { evaluateProvenanceConfidence } from "@/lib/trust/provenance-confidence";

export type AgentTrackingInput = {
  agentId: string;
  agentName: string;
  humanOwner?: string | null;
  action: string;
  declaredIntent: string;
  permissionScope: "matched" | "overbroad" | "mismatch" | "unknown";
  sessionIntegrity?: number;
  runtimeAnomalies?: number;
  providerSignals?: number | null;
};

export type AgentTrackingStep = {
  id: string;
  label: string;
  status: "complete" | "review" | "escalated" | "blocked";
  summary: string;
  evidence: string[];
};

export function buildAgentTrackingFlow(input: AgentTrackingInput) {
  const intent = evaluateIntentRisk({
    actorType: "agent",
    actionType: input.action,
    declaredIntent: input.declaredIntent,
    expectedPermission: "declared_scope",
    actualPermission: input.permissionScope === "matched" ? "declared_scope" : input.permissionScope,
    dataSensitivity: "confidential",
    workflowCriticality: "high",
    anomalyReason: input.runtimeAnomalies && input.runtimeAnomalies > 0.5 ? "Runtime anomaly above review threshold" : null,
    delegatedAuthorityActive: input.permissionScope === "matched",
    humanOwnerPresent: Boolean(input.humanOwner),
    actionBeforeExecution: true,
  });
  const provenance = evaluateProvenanceConfidence({ c2pa: "placeholder", synthId: "placeholder", aiDisclosure: "unknown", evidenceTimelineCount: 2 });
  const decision = evaluateTrustDecision({
    identityConfidence: 0.78,
    agentOwnership: input.humanOwner ? "known" : "orphaned",
    humanAuthority: input.humanOwner ? "active" : "missing",
    intentRisk: intent.riskScore,
    permissionScope: input.permissionScope,
    sessionIntegrity: input.sessionIntegrity ?? 0.72,
    provenanceConfidence: provenance.confidence,
    providerSignals: input.providerSignals,
    heuristicBaseline: 0.72,
    runtimeAnomalies: input.runtimeAnomalies ?? 0.25,
    governanceHistory: [],
    sourceLabels: ["Heuristic Baseline", "Runtime Intelligence", input.providerSignals == null ? "Awaiting Credentials" : "Provider API"],
  });
  const finalStatus =
    decision.decision === "block"
      ? "blocked"
      : decision.decision === "escalate"
        ? "escalated"
        : decision.decision === "review" || decision.decision === "step_up" || decision.decision === "insufficient evidence"
          ? "review"
          : "complete";
  const steps: AgentTrackingStep[] = [
    { id: "discovered", label: "Agent discovered", status: "complete", summary: `${input.agentName} entered the workflow.`, evidence: [input.agentId] },
    { id: "owner", label: "Owner identified", status: input.humanOwner ? "complete" : "review", summary: input.humanOwner ?? "No owner recorded.", evidence: [`human_owner=${input.humanOwner ?? "missing"}`] },
    { id: "authority", label: "Authority checked", status: intent.recommendation === "allow" ? "complete" : "review", summary: intent.escalationReason ?? "Authority and intent match declared scope.", evidence: intent.evidence },
    { id: "signals", label: "Signals evaluated", status: "complete", summary: "Runtime, session, provenance and provider-state labels were evaluated.", evidence: decision.source_labels },
    { id: "posture", label: "Trust posture updated", status: finalStatus, summary: `Decision posture moved to ${decision.decision}.`, evidence: decision.evidence },
    { id: "decision", label: "Decision made", status: finalStatus, summary: decision.reason, evidence: [`confidence=${decision.confidence}`] },
    { id: "replay", label: "Replay event written", status: "complete", summary: "Replay keeps actor, owner, intent, scope, evidence, source labels, decision and outcome together.", evidence: ["evidence preserved", "audit log required", "no silent deletion"] },
  ];

  return {
    agent: { id: input.agentId, name: input.agentName, humanOwner: input.humanOwner ?? null },
    decision: decision.decision as TrustDecision,
    reason: decision.reason,
    intent,
    provenance,
    source_labels: decision.source_labels,
    limitations: decision.limitations,
    steps,
  };
}
