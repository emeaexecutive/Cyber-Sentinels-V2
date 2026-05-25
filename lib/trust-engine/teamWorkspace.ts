export const teamRoles = [
  "owner",
  "admin",
  "reviewer",
  "analyst",
  "viewer",
] as const;

export const teamPermissions = [
  "manage_team",
  "invite_member",
  "review_cases",
  "approve_decisions",
  "view_reports",
  "manage_api_keys",
  "manage_billing",
] as const;

export const futureTeamFields = [
  "team_id",
  "owner_email",
  "role",
  "member_email",
  "invitation_status",
  "team_clearance_tier",
] as const;

export const teamWorkspaceSignals = [
  "team_workspace_opened",
  "team_member_invited",
  "team_case_assigned",
  "team_decision_created",
  "team_api_key_created",
] as const;

export const teamWorkspaceAuditEvents = [
  "team_workspace_accessed",
  "team_member_invited",
  "team_role_changed",
  "team_decision_created",
] as const;

export type TeamRole = (typeof teamRoles)[number];

export type TeamWorkspaceSummary = {
  team_name: string;
  team_trust_score: number;
  open_cases: number;
  pending_reviews: number;
  active_members: number;
  api_usage: string;
  current_plan: string;
  is_demo: boolean;
};

export const demoTeamSummary: TeamWorkspaceSummary = {
  team_name: "Cyber Sentinels Demo Team",
  team_trust_score: 86,
  open_cases: 7,
  pending_reviews: 4,
  active_members: 5,
  api_usage: "1,284 / 5,000",
  current_plan: "Teams",
  is_demo: true,
};

export const demoTeamMembers = [
  {
    id: "team-member-owner",
    member_email: "owner@example.com",
    role: "owner" as TeamRole,
    invitation_status: "active",
  },
  {
    id: "team-member-reviewer",
    member_email: "reviewer@example.com",
    role: "reviewer" as TeamRole,
    invitation_status: "active",
  },
  {
    id: "team-member-analyst",
    member_email: "analyst@example.com",
    role: "analyst" as TeamRole,
    invitation_status: "invited",
  },
];

export const demoTeamPassports = [
  {
    id: "team-passport-agent",
    subject_name: "Hiring Shield Screener",
    subject_type: "agent",
    trust_score: 88,
    review_status: "verified",
  },
  {
    id: "team-passport-candidate",
    subject_name: "Candidate Verification",
    subject_type: "candidate",
    trust_score: 81,
    review_status: "in_review",
  },
];

export const demoTeamCases = [
  {
    id: "team-case-identity",
    subject_name: "Identity verification",
    verification_status: "in_review",
    trust_score: 76,
  },
  {
    id: "team-case-media",
    subject_name: "Synthetic media review",
    verification_status: "escalated",
    trust_score: 64,
  },
];

export const demoTeamReports = [
  {
    id: "team-report-candidate",
    candidate_name: "Candidate Trust Report",
    review_status: "ready",
    trust_score: 84,
  },
  {
    id: "team-report-agent",
    candidate_name: "Agent Passport Report",
    review_status: "draft",
    trust_score: 88,
  },
];

export const demoTeamEvidence = [
  {
    id: "team-evidence-origin",
    file_name: "Origin trace support",
    scan_status: "pending",
  },
  {
    id: "team-evidence-liveness",
    file_name: "Liveness prompt",
    scan_status: "submitted",
  },
];

export const demoTeamDecisions = [
  {
    id: "team-decision-allow",
    decision: "manual_review",
    status: "in_review",
  },
  {
    id: "team-decision-revoke",
    decision: "require_step_up",
    status: "pending",
  },
];
