import type { AssessmentState, ContainmentState, ReviewerDecisionInput, ReviewerRole, WorkspaceRole } from "./types.ts";

const protectedStates = new Set<AssessmentState>(["reporting_required", "not_reportable", "submitted", "resolved"]);
const legalDecisionRoles = new Set<ReviewerRole>(["legal_reviewer", "compliance_reviewer", "data_protection_reviewer", "executive_approver"]);
const packageApprovalRoles = new Set<ReviewerRole>(["legal_reviewer", "compliance_reviewer", "executive_approver"]);

export function assertReviewerAuthorization(input: { workspaceRole: WorkspaceRole; assignedRoles: ReviewerRole[]; decision: ReviewerDecisionInput; approvedPackageId?: string | null }) {
  if (input.workspaceRole === "observer") throw Object.assign(new Error("Observer access cannot record reviewer decisions."), { status: 403, code: "REVIEWER_ROLE_DENIED" });
  if (!input.assignedRoles.includes(input.decision.reviewerRole)) throw Object.assign(new Error("The reviewer role is not assigned to this actor."), { status: 403, code: "REVIEWER_ASSIGNMENT_REQUIRED" });
  const target = input.decision.targetState;
  if (target && protectedStates.has(target) && !legalDecisionRoles.has(input.decision.reviewerRole)) throw Object.assign(new Error("This target state requires an authorized specialist reviewer."), { status: 403, code: "PROTECTED_STATE_REVIEWER_REQUIRED" });
  if (target === "submitted" && !input.approvedPackageId) throw Object.assign(new Error("Submitted state requires a linked approved evidence package and submission record."), { status: 409, code: "APPROVED_PACKAGE_REQUIRED" });
  if (input.decision.decisionType === "submission_approval" && !packageApprovalRoles.has(input.decision.reviewerRole)) throw Object.assign(new Error("Package approval requires an authorized compliance, legal, or executive reviewer."), { status: 403, code: "PACKAGE_APPROVER_REQUIRED" });
  return input.decision;
}

export function assertAutomatedTransition(targetState: AssessmentState) {
  if (["reporting_required", "not_reportable", "submitted", "resolved"].includes(targetState)) throw Object.assign(new Error("Automated technical logic cannot set a protected reporting or closure state."), { status: 403, code: "AUTOMATION_LEGAL_STATE_DENIED" });
  return targetState;
}

export function containmentEvidenceLevel(state: ContainmentState) {
  if (state === "independently_confirmed") return "independently_confirmed";
  if (state === "provider_confirmed") return "provider_confirmed";
  if (state === "provider_acknowledged") return "acknowledged_only";
  if (["requested", "approved", "recommended", "attempted"].includes(state)) return "not_confirmed";
  return "uncertain_or_adverse";
}

export function assertContainmentProgression(input: { state: ContainmentState; evidenceReferences: string[]; independentSource?: string | null }) {
  if (["provider_confirmed", "independently_confirmed", "partially_effective", "failed", "contradicted"].includes(input.state) && !input.evidenceReferences.length) throw Object.assign(new Error("A containment outcome requires linked evidence."), { status: 400, code: "CONTAINMENT_EVIDENCE_REQUIRED" });
  if (input.state === "independently_confirmed" && !input.independentSource) throw Object.assign(new Error("Independent containment confirmation requires an attributed independent source."), { status: 400, code: "INDEPENDENT_CONTAINMENT_SOURCE_REQUIRED" });
  return { ...input, evidenceLevel: containmentEvidenceLevel(input.state) };
}

export function deadlineProvenance(input: { deadline?: string | null; sourceType: "reviewer_supplied" | "policy_supplied" | "externally_supplied" | "unknown"; ruleSource?: string | null; rationale?: string | null; timezone?: string | null; approvedBy?: string | null }) {
  if (input.deadline && input.sourceType === "unknown") throw Object.assign(new Error("A deadline requires an attributed reviewer, approved policy, or external source."), { status: 400, code: "DEADLINE_SOURCE_REQUIRED" });
  if (input.deadline && (!input.ruleSource || !input.rationale || !input.timezone)) throw Object.assign(new Error("A deadline requires its rule source, calculation rationale, and timezone."), { status: 400, code: "DEADLINE_RATIONALE_REQUIRED" });
  return input;
}
