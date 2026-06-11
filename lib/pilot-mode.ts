import "server-only";

export const PILOT_MODE =
  String(process.env.PILOT_MODE ?? "true").toLowerCase() !== "false";

export const pilotModeNotice =
  "Pilot Mode uses isolated workspaces, cases, notifications, governance actions and demo data for controlled enterprise evaluation.";

export const pilotOrganizationStates = [
  "internal",
  "invited",
  "active",
  "suspended",
] as const;

export type PilotOrganizationState = (typeof pilotOrganizationStates)[number];

export const pilotOnboardingChecklist = [
  "Create trust case",
  "Upload evidence",
  "Governance review",
  "Timeline generation",
  "Verification receipt",
  "Replay review",
] as const;

export const pilotVerificationCategories = [
  "Evidence completeness",
  "Reviewer ownership",
  "Governance status",
  "Timeline continuity",
  "Receipt readiness",
  "Replay consistency",
] as const;

export const pilotGovernanceTemplates = [
  {
    name: "Pilot evidence completeness review",
    description:
      "Human reviewer confirms required evidence is present before a pilot trust receipt is relied on.",
    trigger_type: "pilot_evidence_incomplete",
    severity: "medium",
    action_type: "request_evidence",
  },
  {
    name: "Pilot governance completion review",
    description:
      "Human reviewer confirms the trust case has a clear governance status before pilot handoff.",
    trigger_type: "pilot_governance_pending",
    severity: "medium",
    action_type: "human_review_required",
  },
  {
    name: "Pilot replay consistency review",
    description:
      "Operator checks timeline and replay ordering before external pilot review.",
    trigger_type: "pilot_replay_consistency",
    severity: "low",
    action_type: "review_replay",
  },
] as const;

export function pilotWorkspaceSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `pilot-${base || "workspace"}-${Date.now().toString(36)}`;
}

export function normalizePilotOrganizationState(
  value: FormDataEntryValue | null | undefined
): PilotOrganizationState {
  const candidate = String(value ?? "").trim().toLowerCase();

  return pilotOrganizationStates.includes(candidate as PilotOrganizationState)
    ? (candidate as PilotOrganizationState)
    : "invited";
}

export function pilotStateFromWorkspace(row: {
  description?: string | null;
}): PilotOrganizationState {
  const description = row.description ?? "";
  const match = description.match(/pilot state:\s*(internal|invited|active|suspended)/i);

  return match
    ? normalizePilotOrganizationState(match[1])
    : isPilotWorkspace(row)
      ? "active"
      : "internal";
}

export function buildPilotWorkspaceDescription(input: {
  state: PilotOrganizationState;
  organizationName: string;
}) {
  return `Pilot state: ${input.state}. Pilot Mode workspace for isolated design-partner onboarding, trust cases, governance review and operational learning. Organization: ${input.organizationName}.`;
}

export function buildPilotActivationMetadata(input: {
  organizationName: string;
  reviewerEmails: string[];
  state: PilotOrganizationState;
  workspaceId?: string | null;
  trustCaseId?: string | null;
}) {
  return {
    pilot: true,
    pilot_state: input.state,
    organization_name: input.organizationName,
    workspace_id: input.workspaceId ?? null,
    trust_case_id: input.trustCaseId ?? null,
    reviewer_emails: input.reviewerEmails,
    onboarding_checklist: [...pilotOnboardingChecklist],
    verification_categories: [...pilotVerificationCategories],
    governance_templates: pilotGovernanceTemplates.map((template) => ({
      name: template.name,
      trigger_type: template.trigger_type,
      action_type: template.action_type,
      severity: template.severity,
      requires_human_review: true,
    })),
    trust_workflow_defaults: {
      current_state: "case_created",
      next_action: "upload_evidence",
      reviewer_ownership: "creator_assigned_as_workspace_admin",
      unresolved_items: [
        "evidence_upload_required",
        "governance_review_pending",
        "receipt_not_generated",
        "replay_review_pending",
      ],
    },
    sample_replay_structures: [
      "case_created",
      "evidence_uploaded",
      "governance_reviewed",
      "receipt_generated",
      "replay_reviewed",
    ],
  };
}

export function isPilotWorkspace(row: {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
}) {
  return /pilot|design partner|demo/i.test(
    `${row.name ?? ""} ${row.slug ?? ""} ${row.description ?? ""}`
  );
}
