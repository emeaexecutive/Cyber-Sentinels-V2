import type { FusionSignalSource } from "@/lib/detection/signal-fusion";

export type AgentBehaviorEventType =
  | "credential_sweep_pattern"
  | "sensitive_data_discovery"
  | "unusual_tool_sequence"
  | "unexpected_outbound_action"
  | "permission_boundary_violation"
  | "repeated_failed_authorization"
  | "large_data_access"
  | "unknown_agent_runtime";

export type AgentBehaviorEvent = {
  type: AgentBehaviorEventType;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
  replayable: true;
  governanceReviewable: true;
  evidence_refs: string[];
  source_labels: FusionSignalSource[];
  limitations: string[];
};

const eventCopy: Record<AgentBehaviorEventType, string> = {
  credential_sweep_pattern: "Agent behavior resembles repeated discovery or enumeration of credential-bearing locations.",
  sensitive_data_discovery: "Agent accessed or attempted to discover sensitive data resources.",
  unusual_tool_sequence: "Tool sequence differs from the declared workflow pattern.",
  unexpected_outbound_action: "Agent attempted an outbound action outside the expected execution path.",
  permission_boundary_violation: "Action crossed or attempted to cross a declared permission boundary.",
  repeated_failed_authorization: "Repeated failed authorization events require owner and governance review.",
  large_data_access: "Agent touched a large or unusually broad data set.",
  unknown_agent_runtime: "Runtime context or execution environment was not recognized.",
};

const severityByType: Record<AgentBehaviorEventType, AgentBehaviorEvent["severity"]> = {
  credential_sweep_pattern: "high",
  sensitive_data_discovery: "high",
  unusual_tool_sequence: "medium",
  unexpected_outbound_action: "high",
  permission_boundary_violation: "critical",
  repeated_failed_authorization: "high",
  large_data_access: "medium",
  unknown_agent_runtime: "medium",
};

export function createAgentBehaviorEvent(
  type: AgentBehaviorEventType,
  evidence_refs: string[] = []
): AgentBehaviorEvent {
  return {
    type,
    severity: severityByType[type],
    explanation: eventCopy[type],
    replayable: true,
    governanceReviewable: true,
    evidence_refs,
    source_labels: ["Heuristic Baseline", "Runtime Intelligence"],
    limitations: [
      "Behavior event is explainable runtime evidence, not confirmed malicious intent.",
      "Human governance review remains authoritative for escalated action.",
    ],
  };
}

export function inferAgentBehaviorEvents(input: {
  runtimeAction?: string | null;
  accessedResource?: string | null;
  permissionBoundary?: "within_scope" | "overbroad" | "violation" | "unknown";
  failedAuthorizationCount?: number;
  largeDataAccess?: boolean;
  unusualToolSequence?: boolean;
  unexpectedOutboundAction?: boolean;
  unknownRuntime?: boolean;
  sensitiveDataAccessRisk?: number;
  credentialExposureRisk?: number;
  evidence_refs?: string[];
}) {
  const action = `${input.runtimeAction ?? ""} ${input.accessedResource ?? ""}`.toLowerCase();
  const events = new Set<AgentBehaviorEventType>();
  if (input.credentialExposureRisk != null && input.credentialExposureRisk >= 0.55) events.add("credential_sweep_pattern");
  if (input.sensitiveDataAccessRisk != null && input.sensitiveDataAccessRisk >= 0.55) events.add("sensitive_data_discovery");
  if (/secret|token|key|credential|vault/.test(action)) events.add("credential_sweep_pattern");
  if (/export|download|customer|payroll|financial|health|pii|confidential/.test(action)) events.add("sensitive_data_discovery");
  if (input.unusualToolSequence) events.add("unusual_tool_sequence");
  if (input.unexpectedOutboundAction) events.add("unexpected_outbound_action");
  if (input.permissionBoundary === "violation") events.add("permission_boundary_violation");
  if ((input.failedAuthorizationCount ?? 0) >= 3) events.add("repeated_failed_authorization");
  if (input.largeDataAccess) events.add("large_data_access");
  if (input.unknownRuntime) events.add("unknown_agent_runtime");

  return [...events].map((event) => createAgentBehaviorEvent(event, input.evidence_refs));
}
