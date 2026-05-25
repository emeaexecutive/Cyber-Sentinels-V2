import {
  permissionScopes,
  type AgentPermissionScope,
  type AgentRiskLevel,
} from "@/lib/trust-engine/agentRegistry";

export type PermissionSubjectType = "human" | "agent" | "api_key" | "system";

export type PermissionDecision =
  | "allow"
  | "deny"
  | "step_up_required"
  | "manual_review"
  | "revoke";

export type PermissionReasonCode =
  | "low_trust_score"
  | "weak_human_presence"
  | "weak_origin_trace"
  | "missing_permission_scope"
  | "high_risk_action"
  | "admin_approval_required"
  | "evidence_required"
  | "policy_violation"
  | "agent_restricted"
  | "api_key_revoked"
  | "reality_drift_high"
  | "hpg_instability_high"
  | "clone_risk_high";

export type PermissionFirewallInput = {
  subject_type: PermissionSubjectType;
  subject_id?: string | null;
  trust_score?: number | null;
  human_presence_index?: number | null;
  origin_trace_score?: number | null;
  policy_status?: string | null;
  risk_level?: AgentRiskLevel | "low" | "medium" | "high" | "critical" | null;
  requested_action: AgentPermissionScope;
  permission_scope?: AgentPermissionScope | null;
  evidence_status?: string | null;
  admin_approval_status?: string | null;
  reality_drift?: "low" | "medium" | "high" | "critical" | null;
  hpg_state?: "stable" | "drifting" | "anomalous" | "under_review" | "critical" | null;
  clone_risk?: "low" | "watch" | "elevated" | "high" | "critical" | null;
};

export type PermissionFirewallResult = {
  decision: PermissionDecision;
  reason_codes: PermissionReasonCode[];
  recommended_next_step: string;
};

export const highRiskActions: AgentPermissionScope[] = [
  "make_payment",
  "execute_code",
  "access_email",
  "access_files",
  "autonomous_action",
];

export const permissionSignals = [
  "permission_allowed",
  "permission_denied",
  "permission_step_up_required",
  "permission_revoked",
  "agent_permission_escalated",
] as const;

export const permissionAuditEvents = [
  "permission_evaluated",
  "permission_denied",
  "permission_revoked",
  "step_up_required",
] as const;

export const demoPermissionDecisions: Array<{
  subject: string;
  input: PermissionFirewallInput;
}> = [
  {
    subject: "Orion Research Agent",
    input: {
      subject_type: "agent",
      subject_id: "demo-orion-research-agent",
      trust_score: 92,
      human_presence_index: 80,
      origin_trace_score: 82,
      policy_status: "approved",
      risk_level: "low",
      requested_action: "read_profile",
      permission_scope: "read_profile",
      evidence_status: "complete",
      admin_approval_status: "approved",
    },
  },
  {
    subject: "Hiring Shield Screener",
    input: {
      subject_type: "agent",
      subject_id: "demo-hiring-shield-screener",
      trust_score: 71,
      origin_trace_score: 66,
      policy_status: "approved",
      risk_level: "high",
      requested_action: "access_files",
      permission_scope: "access_files",
      evidence_status: "complete",
      admin_approval_status: "missing",
      reality_drift: "high",
      hpg_state: "drifting",
      clone_risk: "high",
    },
  },
  {
    subject: "Unknown Agent",
    input: {
      subject_type: "agent",
      subject_id: "unknown-agent",
      trust_score: 42,
      origin_trace_score: 35,
      policy_status: "restricted",
      risk_level: "critical",
      requested_action: "autonomous_action",
      permission_scope: null,
      evidence_status: "incomplete",
      admin_approval_status: "missing",
    },
  },
  {
    subject: "API Key cs_live_****",
    input: {
      subject_type: "api_key",
      subject_id: "cs_live_placeholder",
      trust_score: 90,
      origin_trace_score: 80,
      policy_status: "approved",
      risk_level: "low",
      requested_action: "connect_api",
      permission_scope: "connect_api",
      evidence_status: "complete",
      admin_approval_status: "approved",
    },
  },
  {
    subject: "Candidate Profile",
    input: {
      subject_type: "human",
      subject_id: "candidate-profile",
      trust_score: 76,
      human_presence_index: 58,
      origin_trace_score: 62,
      policy_status: "approved",
      risk_level: "medium",
      requested_action: "write_profile",
      permission_scope: "write_profile",
      evidence_status: "incomplete",
      admin_approval_status: "approved",
    },
  },
];

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function isApproved(status: string | null | undefined) {
  return ["approved", "verified", "allow"].includes(status ?? "");
}

function nextStep(decision: PermissionDecision) {
  const steps: Record<PermissionDecision, string> = {
    allow: "Allow requested action",
    deny: "Deny permission request",
    step_up_required: "Require admin or human step-up approval",
    manual_review: "Route permission request to manual review",
    revoke: "Revoke access and create incident review",
  };

  return steps[decision];
}

export function evaluatePermissionsFirewall(
  input: PermissionFirewallInput
): PermissionFirewallResult {
  const reasonCodes: PermissionReasonCode[] = [];
  const isHighRisk = highRiskActions.includes(input.requested_action);

  if (!permissionScopes.includes(input.requested_action)) {
    reasonCodes.push("missing_permission_scope");
  }

  if (!input.permission_scope || input.permission_scope !== input.requested_action) {
    reasonCodes.push("missing_permission_scope");
  }

  if (input.risk_level === "critical") {
    reasonCodes.push("high_risk_action");
  }

  if ((input.trust_score ?? 100) < 60) {
    reasonCodes.push("low_trust_score");
  }

  if (
    typeof input.human_presence_index === "number" &&
    input.human_presence_index < 60
  ) {
    reasonCodes.push("weak_human_presence");
  }

  if (
    typeof input.origin_trace_score === "number" &&
    input.origin_trace_score < 50
  ) {
    reasonCodes.push("weak_origin_trace");
  }

  if (isHighRisk) {
    reasonCodes.push("high_risk_action");
  }

  if (input.policy_status === "violation") {
    reasonCodes.push("policy_violation");
  }

  if (input.policy_status === "restricted") {
    reasonCodes.push("agent_restricted");
  }

  if (input.policy_status === "revoked") {
    reasonCodes.push(
      input.subject_type === "api_key" ? "api_key_revoked" : "agent_restricted"
    );
  }

  if (input.evidence_status === "incomplete") {
    reasonCodes.push("evidence_required");
  }

  if (input.reality_drift === "high" || input.reality_drift === "critical") {
    reasonCodes.push("reality_drift_high");
  }

  if (input.hpg_state === "anomalous" || input.hpg_state === "critical") {
    reasonCodes.push("hpg_instability_high");
  }

  if (input.clone_risk === "high" || input.clone_risk === "critical") {
    reasonCodes.push("clone_risk_high");
  }

  if (isHighRisk && input.admin_approval_status === "missing") {
    reasonCodes.push("admin_approval_required");
  }

  const codes = unique(reasonCodes);

  if (codes.includes("api_key_revoked")) {
    return {
      decision: "revoke",
      reason_codes: codes,
      recommended_next_step: nextStep("revoke"),
    };
  }

  if (codes.includes("missing_permission_scope") || input.risk_level === "critical") {
    return {
      decision: "deny",
      reason_codes: codes,
      recommended_next_step: nextStep("deny"),
    };
  }

  if (isHighRisk && (input.trust_score ?? 0) < 85) {
    return {
      decision: "step_up_required",
      reason_codes: codes,
      recommended_next_step: nextStep("step_up_required"),
    };
  }

  if (codes.includes("reality_drift_high")) {
    return {
      decision: "step_up_required",
      reason_codes: codes,
      recommended_next_step: nextStep("step_up_required"),
    };
  }

  if (codes.includes("hpg_instability_high")) {
    return {
      decision: "step_up_required",
      reason_codes: codes,
      recommended_next_step: nextStep("step_up_required"),
    };
  }

  if (codes.includes("clone_risk_high")) {
    return {
      decision: "step_up_required",
      reason_codes: codes,
      recommended_next_step: nextStep("step_up_required"),
    };
  }

  if (
    isHighRisk &&
    input.admin_approval_status === "missing"
  ) {
    return {
      decision: "step_up_required",
      reason_codes: codes,
      recommended_next_step: nextStep("step_up_required"),
    };
  }

  if (
    input.subject_type === "agent" &&
    input.requested_action === "autonomous_action" &&
    !isApproved(input.policy_status)
  ) {
    return {
      decision: "manual_review",
      reason_codes: unique([...codes, "policy_violation"]),
      recommended_next_step: nextStep("manual_review"),
    };
  }

  if (input.evidence_status === "incomplete") {
    return {
      decision: "manual_review",
      reason_codes: codes,
      recommended_next_step: nextStep("manual_review"),
    };
  }

  if (codes.includes("policy_violation") || codes.includes("agent_restricted")) {
    return {
      decision: "manual_review",
      reason_codes: codes,
      recommended_next_step: nextStep("manual_review"),
    };
  }

  return {
    decision: "allow",
    reason_codes: codes,
    recommended_next_step: nextStep("allow"),
  };
}
