export type AgentStatus =
  | "pending"
  | "verified"
  | "restricted"
  | "revoked"
  | "under_review";

export type AgentRiskLevel = "low" | "medium" | "high" | "critical";

export type AgentPermissionScope =
  | "read_profile"
  | "write_profile"
  | "send_message"
  | "access_files"
  | "access_calendar"
  | "access_email"
  | "make_payment"
  | "execute_code"
  | "connect_api"
  | "autonomous_action";

export type AgentRecord = {
  id: string;
  agent_name: string;
  agent_type: string;
  owner_name: string | null;
  owner_email: string | null;
  model_provider: string | null;
  model_family: string | null;
  declared_purpose: string | null;
  permissions: AgentPermissionScope[];
  risk_level: AgentRiskLevel;
  trust_score: number | null;
  origin_trace_score: number | null;
  policy_status: string | null;
  last_verified_at: string | null;
  status: AgentStatus;
  created_at: string | null;
  verified_agent_name: string | null;
  owner_organization: string | null;
  registry_status: string;
  identity_claims: Record<string, unknown>[];
  trust_lineage: Record<string, unknown>[];
  last_trust_recalculation_reason: string | null;
  human_owner?: string | null;
  supervising_admin?: string | null;
  delegated_authority?: string | null;
  signed_action_receipt?: string | null;
  authority_expires_at?: string | null;
  revoked_at?: string | null;
  kill_switch_status?: "enabled" | "disabled" | "pending" | "unknown";
  escalation_owner?: string | null;
  decision_log?: string[];
  governance_review_state?: "approved" | "review" | "escalated" | "blocked" | "pending";
  nhi_status?: "discovered" | "approved" | "shadow";
  credential_type?: string | null;
  access_scope?: string | null;
  orphaned?: boolean;
  runtime_escalation?: string | null;
  last_activity_at?: string | null;
  blast_radius?: string | null;
};

export type AgentRow = Partial<Omit<AgentRecord, "permissions">> & {
  permissions?: AgentPermissionScope[] | string[] | string | null;
  identity_claims?: Record<string, unknown>[] | null;
  trust_lineage?: Record<string, unknown>[] | null;
};

export const agentStatuses: AgentStatus[] = [
  "pending",
  "verified",
  "restricted",
  "revoked",
  "under_review",
];

export const permissionScopes: AgentPermissionScope[] = [
  "read_profile",
  "write_profile",
  "send_message",
  "access_files",
  "access_calendar",
  "access_email",
  "make_payment",
  "execute_code",
  "connect_api",
  "autonomous_action",
];

export const agentRiskLevels: AgentRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const agentSignals = [
  "agent_registered",
  "agent_verified",
  "agent_restricted",
  "agent_revoked",
  "agent_permission_changed",
  "agent_policy_violation",
] as const;

export const agentAuditEvents = [
  "agent_registry_created",
  "agent_permission_updated",
  "agent_verification_completed",
  "agent_revoked",
] as const;

export const demoAgents: AgentRecord[] = [
  {
    id: "demo-orion-research-agent",
    agent_name: "Orion Research Agent",
    agent_type: "research",
    owner_name: "Cyber Sentinels",
    owner_email: "operators@cybersentinels.ai",
    model_provider: "OpenAI",
    model_family: "reasoning",
    declared_purpose: "Research trust context and summarize verification evidence.",
    permissions: ["read_profile", "connect_api"],
    risk_level: "medium",
    trust_score: 82,
    origin_trace_score: 74,
    policy_status: "approved_for_review",
    last_verified_at: new Date().toISOString(),
    status: "verified",
    created_at: new Date().toISOString(),
    verified_agent_name: "Orion Research Agent",
    owner_organization: "Cyber Sentinels",
    registry_status: "verified",
    identity_claims: [{ claim: "declared_purpose", status: "reviewed" }],
    trust_lineage: [{ type: "owner", reference: "Cyber Sentinels" }],
    last_trust_recalculation_reason: "Demo registry review fixture.",
  },
  {
    id: "demo-hiring-shield-screener",
    agent_name: "Hiring Shield Screener",
    agent_type: "candidate_screening",
    owner_name: "Hiring Shield",
    owner_email: "hiring@cybersentinels.ai",
    model_provider: "OpenAI",
    model_family: "screening",
    declared_purpose: "Review candidate trust reports before human review.",
    permissions: ["read_profile", "access_files"],
    risk_level: "high",
    trust_score: 71,
    origin_trace_score: 66,
    policy_status: "manual_review_required",
    last_verified_at: null,
    status: "under_review",
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    verified_agent_name: null,
    owner_organization: "Hiring Shield",
    registry_status: "pending_review",
    identity_claims: [],
    trust_lineage: [],
    last_trust_recalculation_reason: "Manual review required.",
  },
  {
    id: "demo-origin-trace-analyst",
    agent_name: "Origin Trace Analyst",
    agent_type: "provenance_analysis",
    owner_name: "Origin Trace",
    owner_email: "origin@cybersentinels.ai",
    model_provider: "Anthropic",
    model_family: "analysis",
    declared_purpose: "Assist provenance review and source attribution.",
    permissions: ["read_profile", "access_files", "connect_api"],
    risk_level: "medium",
    trust_score: 78,
    origin_trace_score: 84,
    policy_status: "approved_for_origin_trace",
    last_verified_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: "verified",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    verified_agent_name: "Origin Trace Analyst",
    owner_organization: "Origin Trace",
    registry_status: "verified",
    identity_claims: [{ claim: "provenance_analysis", status: "reviewed" }],
    trust_lineage: [{ type: "owner", reference: "Origin Trace" }],
    last_trust_recalculation_reason: "Registry evidence refreshed.",
  },
  {
    id: "demo-evidence-vault-classifier",
    agent_name: "Evidence Vault Classifier",
    agent_type: "evidence_classification",
    owner_name: "Evidence Vault",
    owner_email: "evidence@cybersentinels.ai",
    model_provider: "OpenAI",
    model_family: "classification",
    declared_purpose: "Classify uploaded evidence and scan status.",
    permissions: ["access_files", "connect_api"],
    risk_level: "high",
    trust_score: 69,
    origin_trace_score: 58,
    policy_status: "restricted_files_only",
    last_verified_at: null,
    status: "restricted",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    verified_agent_name: null,
    owner_organization: "Evidence Vault",
    registry_status: "restricted",
    identity_claims: [],
    trust_lineage: [],
    last_trust_recalculation_reason: "File scope restriction applied.",
  },
  {
    id: "demo-mission-control-observer",
    agent_name: "Mission Control Observer",
    agent_type: "operations_monitor",
    owner_name: "Mission Control",
    owner_email: "mission@cybersentinels.ai",
    model_provider: "OpenAI",
    model_family: "monitoring",
    declared_purpose: "Observe trust operations and flag drift.",
    permissions: ["read_profile", "connect_api", "autonomous_action"],
    risk_level: "critical",
    trust_score: 63,
    origin_trace_score: 61,
    policy_status: "autonomous_action_blocked",
    last_verified_at: null,
    status: "under_review",
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    verified_agent_name: null,
    owner_organization: "Mission Control",
    registry_status: "pending_review",
    identity_claims: [],
    trust_lineage: [],
    last_trust_recalculation_reason: "Autonomous action requires governance review.",
  },
];

function normalizeStatus(status: string | null | undefined): AgentStatus {
  return status && agentStatuses.includes(status as AgentStatus)
    ? (status as AgentStatus)
    : "pending";
}

function normalizeRisk(risk: string | null | undefined): AgentRiskLevel {
  return risk && agentRiskLevels.includes(risk as AgentRiskLevel)
    ? (risk as AgentRiskLevel)
    : "medium";
}

function normalizePermissions(
  permissions: AgentRow["permissions"]
): AgentPermissionScope[] {
  const values = Array.isArray(permissions)
    ? permissions
    : typeof permissions === "string"
      ? permissions.split(",").map((value) => value.trim())
      : [];

  return values.filter((value): value is AgentPermissionScope =>
    permissionScopes.includes(value as AgentPermissionScope)
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function normalizeAgent(row: AgentRow): AgentRecord {
  return {
    id: String(row.id ?? "agent-placeholder"),
    agent_name: String(row.agent_name ?? "Unnamed agent"),
    agent_type: String(row.agent_type ?? "general_agent"),
    owner_name: row.owner_name ?? null,
    owner_email: row.owner_email ?? null,
    model_provider: row.model_provider ?? null,
    model_family: row.model_family ?? null,
    declared_purpose: row.declared_purpose ?? null,
    permissions: normalizePermissions(row.permissions),
    risk_level: normalizeRisk(row.risk_level),
    trust_score:
      typeof row.trust_score === "number" ? row.trust_score : null,
    origin_trace_score:
      typeof row.origin_trace_score === "number"
        ? row.origin_trace_score
        : null,
    policy_status: row.policy_status ?? "pending_policy_review",
    last_verified_at: row.last_verified_at ?? null,
    status: normalizeStatus(row.status),
    created_at: row.created_at ?? null,
    verified_agent_name: row.verified_agent_name ?? null,
    owner_organization: row.owner_organization ?? null,
    registry_status: row.registry_status ?? row.status ?? "pending_review",
    identity_claims: Array.isArray(row.identity_claims) ? row.identity_claims : [],
    trust_lineage: Array.isArray(row.trust_lineage) ? row.trust_lineage : [],
    last_trust_recalculation_reason: row.last_trust_recalculation_reason ?? null,
    human_owner: String(row.human_owner ?? row.owner_name ?? "").trim() || null,
    supervising_admin: String(row.supervising_admin ?? "").trim() || null,
    delegated_authority: String(row.delegated_authority ?? row.policy_status ?? "").trim() || null,
    signed_action_receipt: String(row.signed_action_receipt ?? "").trim() || null,
    authority_expires_at: row.authority_expires_at ?? null,
    revoked_at: row.revoked_at ?? null,
    kill_switch_status: ["enabled", "disabled", "pending"].includes(String(row.kill_switch_status))
      ? (String(row.kill_switch_status) as AgentRecord["kill_switch_status"])
      : "unknown",
    escalation_owner: String(row.escalation_owner ?? row.owner_name ?? "").trim() || null,
    decision_log: normalizeStringArray(row.decision_log),
    governance_review_state: ["approved", "review", "escalated", "blocked", "pending"].includes(String(row.governance_review_state))
      ? (String(row.governance_review_state) as AgentRecord["governance_review_state"])
      : row.status === "revoked"
        ? "blocked"
        : row.status === "under_review"
          ? "review"
          : row.status === "verified"
            ? "approved"
            : "pending",
    nhi_status: ["discovered", "approved", "shadow"].includes(String(row.nhi_status))
      ? (String(row.nhi_status) as AgentRecord["nhi_status"])
      : row.status === "verified"
        ? "approved"
        : row.owner_name || row.owner_email
          ? "discovered"
          : "shadow",
    credential_type: String(row.credential_type ?? "").trim() || null,
    access_scope: String(row.access_scope ?? "").trim() || null,
    orphaned: row.orphaned === true || (!row.owner_name && !row.owner_email),
    runtime_escalation: String(row.runtime_escalation ?? "").trim() || null,
    last_activity_at: row.last_activity_at ?? row.last_verified_at ?? row.created_at ?? null,
    blast_radius: String(row.blast_radius ?? "").trim() || null,
  };
}

export function normalizeAgents(rows: AgentRow[] | null | undefined) {
  return (rows ?? []).map(normalizeAgent);
}

export function getAgentRegistrySummary(agents: AgentRecord[]) {
  return {
    total: agents.length,
    pending: agents.filter((agent) => agent.status === "pending").length,
    verified: agents.filter((agent) => agent.status === "verified").length,
    restricted: agents.filter((agent) => agent.status === "restricted").length,
    revoked: agents.filter((agent) => agent.status === "revoked").length,
    underReview: agents.filter((agent) => agent.status === "under_review")
      .length,
    highRisk: agents.filter((agent) =>
      ["high", "critical"].includes(agent.risk_level)
    ).length,
    shadow: agents.filter((agent) => agent.nhi_status === "shadow").length,
    orphaned: agents.filter((agent) => agent.orphaned).length,
    killSwitchEnabled: agents.filter((agent) => agent.kill_switch_status === "enabled").length,
  };
}
