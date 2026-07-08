export type EntityIdentityType =
  | "human"
  | "ai_agent"
  | "machine_identity"
  | "regulated_workflow";

export type EntityVerificationStatus =
  | "verified"
  | "partially_verified"
  | "awaiting_evidence"
  | "manual_review"
  | "blocked";

export type EntityTrustPosture =
  | "trusted"
  | "review"
  | "escalated"
  | "blocked"
  | "insufficient_evidence";

export type EntityGovernanceStatus =
  | "clear"
  | "review_required"
  | "in_review"
  | "escalated"
  | "override_logged";

export type EntityRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export type HumanIdentityEvidence = {
  supabase_user_id?: string | null;
  email_verified?: boolean | null;
  phone_mfa_status?: "enabled" | "disabled" | "not_recorded" | null;
  proof_of_human_provider_status?: "verified" | "awaiting_credentials" | "not_configured" | "failed" | null;
  device_session_continuity?: "continuous" | "changed" | "unknown" | null;
  geo_session_risk?: EntityRiskLevel | null;
  manual_review_status?: EntityGovernanceStatus | null;
};

export type AiAgentIdentityEvidence = {
  agent_registry_id?: string | null;
  agent_name?: string | null;
  owner_organization?: string | null;
  human_authority?: string | null;
  delegated_permissions?: string[];
  signed_action_receipts?: string[];
  runtime_session_status?: "active" | "inactive" | "review" | "unknown" | null;
  kill_switch_status?: "not_recommended" | "review_kill_switch" | "kill_switch_recommended" | "activated_placeholder" | null;
};

export type MachineIdentityEvidence = {
  service_account?: string | null;
  api_key_placeholder?: string | null;
  oauth_app_placeholder?: string | null;
  certificate_placeholder?: string | null;
  token_scope?: string[];
  credential_owner?: string | null;
  expiry_rotation_status?: "current" | "rotation_due" | "expired" | "not_recorded" | null;
  orphaned_status?: "owned" | "orphaned" | "unknown" | null;
  linked_agent_or_workflow?: string | null;
};

export type RegulatedWorkflowIdentityEvidence = {
  workflow_type?: string | null;
  data_sensitivity?: "low" | "moderate" | "high" | "regulated" | null;
  policy_requirement?: string | null;
  approval_requirement?: string | null;
  replay_requirement?: string | null;
  evidence_requirement?: string | null;
  regulatory_context_placeholder?: string | null;
  governance_owner?: string | null;
};

export type EntityIdentityEvidence = {
  human?: HumanIdentityEvidence;
  ai_agent?: AiAgentIdentityEvidence;
  machine_identity?: MachineIdentityEvidence;
  regulated_workflow?: RegulatedWorkflowIdentityEvidence;
};

export type EntityIdentityInput = {
  id: string;
  type: EntityIdentityType;
  owner?: string | null;
  authority?: string | null;
  verification_status?: EntityVerificationStatus | null;
  trust_posture?: EntityTrustPosture | null;
  evidence_refs?: string[];
  replay_refs?: string[];
  governance_status?: EntityGovernanceStatus | null;
  risk_level?: EntityRiskLevel | null;
  evidence?: EntityIdentityEvidence;
};

export type EntityIdentity = {
  id: string;
  type: EntityIdentityType;
  owner: string;
  authority: string;
  verification_status: EntityVerificationStatus;
  trust_posture: EntityTrustPosture;
  evidence_refs: string[];
  replay_refs: string[];
  governance_status: EntityGovernanceStatus;
  risk_level: EntityRiskLevel;
  evidence: EntityIdentityEvidence;
  control_plane: {
    trust_engine: true;
    runtime_engine: true;
    decision_engine: true;
    workflow_executor: true;
    replay_engine: true;
    governance_engine: true;
    ml_validation_engine: true;
  };
  boundary: string;
};

function refs(values?: string[]) {
  return [...new Set((values ?? []).map(String).filter(Boolean))];
}

export function normalizeEntityIdentity(input: EntityIdentityInput): EntityIdentity {
  return {
    id: String(input.id || "entity-not-recorded"),
    type: input.type,
    owner: input.owner ?? "Owner not recorded",
    authority: input.authority ?? "Authority not recorded",
    verification_status: input.verification_status ?? "awaiting_evidence",
    trust_posture: input.trust_posture ?? "insufficient_evidence",
    evidence_refs: refs(input.evidence_refs),
    replay_refs: refs(input.replay_refs),
    governance_status: input.governance_status ?? "review_required",
    risk_level: input.risk_level ?? "unknown",
    evidence: input.evidence ?? {},
    control_plane: {
      trust_engine: true,
      runtime_engine: true,
      decision_engine: true,
      workflow_executor: true,
      replay_engine: true,
      governance_engine: true,
      ml_validation_engine: true,
    },
    boundary:
      "Entity identity is a governed trust context. It is not biometric certainty, hidden surveillance or autonomous proof of authenticity.",
  };
}

export const entityIdentityModel: EntityIdentity[] = [
  normalizeEntityIdentity({
    id: "human-identity",
    type: "human",
    owner: "Account owner",
    authority: "Authenticated user authority and reviewer-approved workflow scope",
    verification_status: "partially_verified",
    trust_posture: "review",
    governance_status: "review_required",
    risk_level: "medium",
    evidence_refs: ["supabase_auth_user", "email_verification", "session_integrity", "manual_review"],
    replay_refs: ["human_identity_replay"],
    evidence: {
      human: {
        supabase_user_id: "Supabase auth user ID",
        email_verified: null,
        phone_mfa_status: "not_recorded",
        proof_of_human_provider_status: "awaiting_credentials",
        device_session_continuity: "unknown",
        geo_session_risk: "unknown",
        manual_review_status: "review_required",
      },
    },
  }),
  normalizeEntityIdentity({
    id: "ai-agent-identity",
    type: "ai_agent",
    owner: "Owner organization",
    authority: "Named human authority and delegated permission scope",
    verification_status: "partially_verified",
    trust_posture: "review",
    governance_status: "review_required",
    risk_level: "medium",
    evidence_refs: ["agent_registry", "delegated_permissions", "signed_action_receipts", "runtime_session"],
    replay_refs: ["agent_action_replay"],
    evidence: {
      ai_agent: {
        agent_registry_id: "agent registry ID",
        agent_name: "Registered agent name",
        owner_organization: "Owner organization",
        human_authority: "Named human authority",
        delegated_permissions: ["declared_scope", "workflow_bound_permissions"],
        signed_action_receipts: ["receipt_reference"],
        runtime_session_status: "unknown",
        kill_switch_status: "not_recommended",
      },
    },
  }),
  normalizeEntityIdentity({
    id: "machine-identity",
    type: "machine_identity",
    owner: "Credential owner",
    authority: "Token scope, credential owner and linked workflow",
    verification_status: "awaiting_evidence",
    trust_posture: "review",
    governance_status: "review_required",
    risk_level: "unknown",
    evidence_refs: ["service_account", "api_key_placeholder", "oauth_app_placeholder", "certificate_placeholder", "rotation_status"],
    replay_refs: ["credential_use_replay"],
    evidence: {
      machine_identity: {
        service_account: "service account",
        api_key_placeholder: "API key placeholder only",
        oauth_app_placeholder: "OAuth app placeholder only",
        certificate_placeholder: "certificate placeholder only",
        token_scope: ["declared_scope"],
        credential_owner: "Credential owner",
        expiry_rotation_status: "not_recorded",
        orphaned_status: "unknown",
        linked_agent_or_workflow: "linked agent or workflow",
      },
    },
  }),
  normalizeEntityIdentity({
    id: "regulated-workflow",
    type: "regulated_workflow",
    owner: "Governance owner",
    authority: "Policy, approval and evidence requirement",
    verification_status: "partially_verified",
    trust_posture: "review",
    governance_status: "review_required",
    risk_level: "medium",
    evidence_refs: ["workflow_type", "data_sensitivity", "policy_requirement", "approval_requirement", "evidence_requirement"],
    replay_refs: ["workflow_replay"],
    evidence: {
      regulated_workflow: {
        workflow_type: "regulated workflow",
        data_sensitivity: "regulated",
        policy_requirement: "policy requirement placeholder",
        approval_requirement: "approval requirement placeholder",
        replay_requirement: "replay required",
        evidence_requirement: "evidence required",
        regulatory_context_placeholder: "regulatory context placeholder",
        governance_owner: "Governance owner",
      },
    },
  }),
];

export function entityDecisionSurface(entity: EntityIdentity) {
  return {
    entity_type: entity.type,
    authority: entity.authority,
    evidence: entity.evidence_refs,
    trust_posture: entity.trust_posture,
    decision: entity.trust_posture === "trusted" ? "allow" : entity.trust_posture === "blocked" ? "block" : "review",
    outcome:
      entity.trust_posture === "trusted"
        ? "Action can proceed with replay retained."
        : entity.trust_posture === "blocked"
          ? "Action is blocked while evidence and governance context are retained."
          : "Action requires review, step-up verification or governance routing before reliance.",
  };
}
