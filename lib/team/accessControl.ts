export const teamAccessRoles = [
  "owner",
  "admin",
  "reviewer",
  "analyst",
  "viewer",
] as const;

export const teamAccessPermissions = [
  "manage_team",
  "invite_member",
  "review_cases",
  "approve_decisions",
  "view_reports",
  "manage_api_keys",
  "manage_billing",
  "view_evidence",
  "export_reports",
] as const;

export const invitationStatuses = [
  "pending",
  "accepted",
  "expired",
  "revoked",
] as const;

export type TeamAccessRole = (typeof teamAccessRoles)[number];
export type TeamAccessPermission = (typeof teamAccessPermissions)[number];
export type InvitationStatus = (typeof invitationStatuses)[number];

const rolePermissions: Record<TeamAccessRole, TeamAccessPermission[]> = {
  owner: [
    "manage_team",
    "invite_member",
    "review_cases",
    "approve_decisions",
    "view_reports",
    "manage_api_keys",
    "manage_billing",
    "view_evidence",
    "export_reports",
  ],
  admin: [
    "manage_team",
    "invite_member",
    "review_cases",
    "approve_decisions",
    "view_reports",
    "manage_api_keys",
    "view_evidence",
    "export_reports",
  ],
  reviewer: [
    "review_cases",
    "approve_decisions",
    "view_reports",
    "view_evidence",
  ],
  analyst: ["review_cases", "view_reports", "view_evidence", "export_reports"],
  viewer: ["view_reports"],
};

export const teamAccessSignals = [
  "team_invite_created",
  "team_invite_accepted",
  "team_invite_revoked",
  "team_role_changed",
] as const;

export const teamAccessAuditEvents = [
  "team_invite_created",
  "team_access_changed",
  "team_role_changed",
] as const;

export const demoInvitations = [
  {
    id: "invite-reviewer",
    email: "reviewer@example.com",
    role: "reviewer" as TeamAccessRole,
    invitation_status: "pending" as InvitationStatus,
  },
  {
    id: "invite-analyst",
    email: "analyst@example.com",
    role: "analyst" as TeamAccessRole,
    invitation_status: "pending" as InvitationStatus,
  },
];

export function getRolePermissions(role: string | null | undefined) {
  if (!role || !teamAccessRoles.includes(role as TeamAccessRole)) {
    return rolePermissions.viewer;
  }

  return rolePermissions[role as TeamAccessRole];
}

export function canInviteMember(role: string | null | undefined) {
  return getRolePermissions(role).includes("invite_member");
}

export function canApproveDecision(role: string | null | undefined) {
  return getRolePermissions(role).includes("approve_decisions");
}

export function canManageBilling(role: string | null | undefined) {
  return getRolePermissions(role).includes("manage_billing");
}

export function canViewEvidence(role: string | null | undefined) {
  return getRolePermissions(role).includes("view_evidence");
}
