import { inferAgentBehaviorEvents, type AgentBehaviorEvent } from "@/lib/agents/agent-behavior-events";
import type { FusionSignalSource } from "@/lib/detection/signal-fusion";
import { evaluateCredentialExposureRisk } from "@/lib/security/credential-exposure-risk";
import { evaluateTrustDecision, type TrustDecision } from "@/lib/trust/decision-engine";

export type AgentRuntimeControlInput = {
  agentId: string;
  agentName?: string | null;
  humanOwner?: string | null;
  delegatedAuthority?: "active" | "expired" | "missing" | "unknown";
  permissionBoundary?: "within_scope" | "overbroad" | "violation" | "unknown";
  runtimeAction: string;
  accessedResource?: string | null;
  credentialType?: "api_key" | "oauth_token" | "service_account" | "session_token" | "unknown" | null;
  accessScope?: string | null;
  orphanedStatus?: boolean;
  linkedAgent?: string | null;
  authorizationLineage?: string[];
  delegatedConstraints?: string[];
  expiryStatus?: "active" | "expired" | "revoked" | "unknown";
  highScopeCredential?: boolean;
  unusualCredentialUsage?: boolean;
  agentAccessToSensitiveSecrets?: boolean;
  outboundActionWithCredentialRisk?: boolean;
  sensitiveDataAccessRisk?: number;
  failedAuthorizationCount?: number;
  largeDataAccess?: boolean;
  unusualToolSequence?: boolean;
  unexpectedOutboundAction?: boolean;
  unknownRuntime?: boolean;
  sessionIntegrity?: number | null;
  provenanceConfidence?: number | null;
  providerSignals?: number | null;
  reviewedOutcomeRisk?: number | null;
  evidence_refs?: string[];
};

export type AgentRuntimeDecision = TrustDecision;

function permissionScope(input: AgentRuntimeControlInput) {
  if (input.permissionBoundary === "violation") return "mismatch";
  if (input.permissionBoundary === "overbroad") return "overbroad";
  if (input.permissionBoundary === "within_scope") return "matched";
  return "unknown";
}

function runtimeAnomalyRisk(events: AgentBehaviorEvent[], credentialRisk: number, reviewedOutcomeRisk?: number | null) {
  const eventRisk = events.length
    ? Math.min(1, events.reduce((total, event) => {
        if (event.severity === "critical") return total + 0.9;
        if (event.severity === "high") return total + 0.7;
        if (event.severity === "medium") return total + 0.45;
        return total + 0.2;
      }, 0) / events.length)
    : 0.1;
  const reviewed = reviewedOutcomeRisk == null ? 0.1 : Math.max(0, Math.min(1, reviewedOutcomeRisk));
  return Number((eventRisk * 0.45 + credentialRisk * 0.4 + reviewed * 0.15).toFixed(3));
}

export function evaluateAgentRuntimeControl(input: AgentRuntimeControlInput) {
  const evidenceRefs = [...(input.evidence_refs ?? [])];
  const credentialExposure = evaluateCredentialExposureRisk({
    runtimeAction: input.runtimeAction,
    accessedResource: input.accessedResource,
    credentialType: input.credentialType,
    highScopeCredential: input.highScopeCredential,
    orphanedCredential: input.orphanedStatus,
    unusualCredentialUsage: input.unusualCredentialUsage,
    agentAccessToSensitiveSecrets: input.agentAccessToSensitiveSecrets,
    outboundActionWithCredentialRisk: input.outboundActionWithCredentialRisk,
    evidence_refs: evidenceRefs,
  });
  const behaviorEvents = inferAgentBehaviorEvents({
    runtimeAction: input.runtimeAction,
    accessedResource: input.accessedResource,
    permissionBoundary: input.permissionBoundary,
    failedAuthorizationCount: input.failedAuthorizationCount,
    largeDataAccess: input.largeDataAccess,
    unusualToolSequence: input.unusualToolSequence,
    unexpectedOutboundAction: input.unexpectedOutboundAction,
    unknownRuntime: input.unknownRuntime,
    sensitiveDataAccessRisk: input.sensitiveDataAccessRisk,
    credentialExposureRisk: credentialExposure.risk_score,
    evidence_refs: evidenceRefs,
  });
  const anomalyRisk = runtimeAnomalyRisk(behaviorEvents, credentialExposure.risk_score, input.reviewedOutcomeRisk);
  const decision = evaluateTrustDecision({
    identityConfidence: input.agentName ? 0.72 : 0.45,
    agentOwnership: input.orphanedStatus ? "orphaned" : input.humanOwner ? "known" : "unknown",
    humanAuthority: input.delegatedAuthority === "active" ? "active" : input.delegatedAuthority === "expired" ? "expired" : "missing",
    permissionScope: permissionScope(input),
    sessionIntegrity: input.sessionIntegrity ?? 0.68,
    provenanceConfidence: input.provenanceConfidence ?? 0.62,
    providerSignals: input.providerSignals,
    heuristicBaseline: 1 - Math.min(0.95, anomalyRisk),
    runtimeAnomalies: anomalyRisk,
    governanceHistory: input.expiryStatus === "revoked" ? ["blocked"] : [],
    sourceLabels: ["Heuristic Baseline", "Runtime Intelligence", input.providerSignals == null ? "Awaiting Credentials" : "Provider API"],
  });
  const killSwitchStatus =
    decision.decision === "block"
      ? "kill_switch_recommended"
      : input.expiryStatus === "revoked"
        ? "kill_switch_activated_placeholder"
        : decision.decision === "escalate"
          ? "review_kill_switch"
          : "not_recommended";
  const sourceLabels = [...new Set([
    ...decision.source_labels,
    ...credentialExposure.source_labels,
    ...behaviorEvents.flatMap((event) => event.source_labels),
  ])] as FusionSignalSource[];

  return {
    agent: {
      id: input.agentId,
      name: input.agentName ?? "Unknown agent",
      human_owner: input.humanOwner ?? "No owner recorded",
      delegated_authority: input.delegatedAuthority ?? "unknown",
      permission_boundary: input.permissionBoundary ?? "unknown",
      access_scope: input.accessScope ?? "not recorded",
      linked_agent: input.linkedAgent ?? input.agentId,
      credential_type: input.credentialType ?? "unknown",
      orphaned_status: Boolean(input.orphanedStatus),
      expiry_status: input.expiryStatus ?? "unknown",
    },
    runtime_action: input.runtimeAction,
    accessed_resource: input.accessedResource ?? "not recorded",
    authorization_lineage: [...(input.authorizationLineage ?? [])],
    delegated_constraints: [...(input.delegatedConstraints ?? [])],
    credential_exposure: credentialExposure,
    suspicious_behavior_events: behaviorEvents,
    decision: decision.decision as AgentRuntimeDecision,
    reason: decision.reason,
    evidence_refs: evidenceRefs,
    confidence: decision.confidence,
    limitations: [
      ...decision.limitations,
      ...credentialExposure.limitations,
      "Kill-switch status is a governance recommendation or placeholder unless an integrated runtime exposes an activation API.",
      "Cyber Sentinels preserves evidence and review state; it does not silently delete data.",
    ],
    source_labels: sourceLabels,
    kill_switch: {
      status: killSwitchStatus,
      recommended: killSwitchStatus === "kill_switch_recommended" || killSwitchStatus === "review_kill_switch",
      activated_placeholder: killSwitchStatus === "kill_switch_activated_placeholder",
      evidence_required: ["audit log", "replay event", "governance review", "human reviewer status"],
    },
    replay_evidence_model: {
      agent: input.agentName ?? input.agentId,
      human_owner: input.humanOwner ?? "No owner recorded",
      authority: input.delegatedAuthority ?? "unknown",
      permission_boundary: input.permissionBoundary ?? "unknown",
      action_intent: input.runtimeAction,
      accessed_resources: input.accessedResource ? [input.accessedResource] : [],
      credential_api_key_risk: credentialExposure.risk_band,
      suspicious_behavior_event: behaviorEvents.map((event) => event.type),
      trust_decision: decision.decision,
      governance_action: ["review", "step_up", "escalate", "block", "insufficient_evidence", "insufficient evidence"].includes(decision.decision)
        ? "governance_review_required"
        : "retain_evidence",
    },
  };
}
