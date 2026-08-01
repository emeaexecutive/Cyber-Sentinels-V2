import type { AssessmentState, ContainmentState, ReviewerDecisionInput, ReviewerRole, WorkspaceRole } from "./types.ts";

export const assessmentTransitionMatrix: Readonly<Record<AssessmentState, readonly AssessmentState[]>> = {
  draft: ["evidence_collection"],
  evidence_collection: ["technical_review", "security_review", "compliance_review", "data_protection_review", "legal_review", "potentially_reportable"],
  technical_review: ["evidence_collection", "security_review", "compliance_review", "legal_review", "potentially_reportable"],
  security_review: ["evidence_collection", "technical_review", "compliance_review", "legal_review", "potentially_reportable"],
  compliance_review: ["evidence_collection", "data_protection_review", "legal_review", "executive_review", "potentially_reportable", "not_reportable", "reporting_required"],
  data_protection_review: ["evidence_collection", "compliance_review", "legal_review", "executive_review", "potentially_reportable", "not_reportable", "reporting_required"],
  legal_review: ["evidence_collection", "compliance_review", "data_protection_review", "executive_review", "potentially_reportable", "not_reportable", "reporting_required"],
  executive_review: ["compliance_review", "legal_review", "not_reportable", "reporting_required"],
  potentially_reportable: ["evidence_collection", "compliance_review", "data_protection_review", "legal_review", "executive_review", "not_reportable", "reporting_required"],
  not_reportable: ["corrective_action_open", "resolved", "reopened"],
  reporting_required: ["submitted", "corrective_action_open", "reopened"],
  submitted: ["additional_information_requested", "corrective_action_open", "resolved", "reopened"],
  additional_information_requested: ["compliance_review", "data_protection_review", "legal_review", "executive_review", "submitted", "corrective_action_open"],
  corrective_action_open: ["compliance_review", "legal_review", "resolved", "reopened"],
  resolved: ["reopened"],
  reopened: ["evidence_collection", "technical_review", "security_review", "compliance_review", "data_protection_review", "legal_review", "corrective_action_open"],
};

const protectedStates = new Set<AssessmentState>(["reporting_required", "not_reportable", "submitted", "resolved"]);
const reportingDecisionRoles = new Set<ReviewerRole>(["legal_reviewer", "compliance_reviewer", "data_protection_reviewer", "executive_approver"]);
const packageApprovalRoles = new Set<ReviewerRole>(["legal_reviewer", "compliance_reviewer", "executive_approver"]);
const decisionRoles: Readonly<Record<ReviewerDecisionInput["decisionType"], ReadonlySet<ReviewerRole>>> = {
  technical_finding: new Set(["technical_reviewer", "security_reviewer", "system_owner"]),
  impact_assessment: new Set(["technical_reviewer", "security_reviewer", "data_protection_reviewer", "legal_reviewer"]),
  regulatory_relevance_assessment: new Set(["compliance_reviewer", "legal_reviewer", "data_protection_reviewer", "external_adviser"]),
  reporting_decision: reportingDecisionRoles,
  submission_approval: packageApprovalRoles,
  corrective_action_approval: new Set(["security_reviewer", "compliance_reviewer", "legal_reviewer", "executive_approver"]),
  closure_approval: new Set(["compliance_reviewer", "legal_reviewer", "executive_approver"]),
  reopening_decision: new Set(["technical_reviewer", "security_reviewer", "compliance_reviewer", "legal_reviewer", "executive_approver"]),
};

const targetStateRoles: Partial<Record<AssessmentState, ReadonlySet<ReviewerRole>>> = {
  technical_review: new Set(["technical_reviewer"]),
  security_review: new Set(["security_reviewer"]),
  compliance_review: new Set(["compliance_reviewer"]),
  data_protection_review: new Set(["data_protection_reviewer"]),
  legal_review: new Set(["legal_reviewer"]),
  executive_review: new Set(["executive_approver"]),
  potentially_reportable: new Set(["technical_reviewer", "security_reviewer", "compliance_reviewer", "legal_reviewer", "data_protection_reviewer"]),
  reporting_required: reportingDecisionRoles,
  not_reportable: reportingDecisionRoles,
  submitted: packageApprovalRoles,
  resolved: new Set(["compliance_reviewer", "legal_reviewer", "executive_approver"]),
  reopened: new Set(["technical_reviewer", "security_reviewer", "compliance_reviewer", "legal_reviewer", "executive_approver"]),
};

export function assertAssessmentTransition(from: AssessmentState, to: AssessmentState) {
  if (!assessmentTransitionMatrix[from].includes(to)) {
    throw Object.assign(new Error(`Transition from ${from} to ${to} is not permitted.`), { status: 409, code: "ASSESSMENT_TRANSITION_DENIED" });
  }
  return to;
}

export function assertTransitionPrerequisites(input: {
  from: AssessmentState;
  decision: ReviewerDecisionInput;
  hasSubmissionEvidence: boolean;
  hasRegulatorResponse: boolean;
  outstandingMandatoryCorrectiveActionIds: string[];
}) {
  const target = input.decision.targetState;
  if (!target) return input.decision;
  assertAssessmentTransition(input.from, target);
  if (target === "additional_information_requested" && !input.hasSubmissionEvidence && !input.hasRegulatorResponse) {
    throw Object.assign(new Error("Additional information can only be requested after evidenced submission or regulator response."), { status: 409, code: "REGULATOR_FOLLOW_UP_EVIDENCE_REQUIRED" });
  }
  if (target === "resolved" && input.outstandingMandatoryCorrectiveActionIds.length) {
    const explicitOverride = input.decision.conditions.includes("authorized_corrective_action_override") && input.decision.evidenceReferences.length > 0 && ["legal_reviewer", "executive_approver"].includes(input.decision.reviewerRole);
    if (!explicitOverride) throw Object.assign(new Error("Resolution requires validated corrective actions or an evidenced authorized override."), { status: 409, code: "CORRECTIVE_ACTIONS_OUTSTANDING" });
  }
  return input.decision;
}

export function assertReviewerAuthorization(input: { workspaceRole: WorkspaceRole; assignedRoles: ReviewerRole[]; decision: ReviewerDecisionInput; approvedPackageId?: string | null }) {
  if (input.workspaceRole === "observer") throw Object.assign(new Error("Observer access cannot record reviewer decisions."), { status: 403, code: "REVIEWER_ROLE_DENIED" });
  if (!input.assignedRoles.includes(input.decision.reviewerRole)) throw Object.assign(new Error("The reviewer role is not assigned to this actor."), { status: 403, code: "REVIEWER_ASSIGNMENT_REQUIRED" });
  if (!decisionRoles[input.decision.decisionType].has(input.decision.reviewerRole)) throw Object.assign(new Error("The assigned reviewer role cannot record this decision type."), { status: 403, code: "DECISION_ROLE_DENIED" });
  const target = input.decision.targetState;
  const allowedTargetRoles = target ? targetStateRoles[target] : undefined;
  if (allowedTargetRoles && !allowedTargetRoles.has(input.decision.reviewerRole)) throw Object.assign(new Error("The assigned reviewer role cannot set this workflow state."), { status: 403, code: "TARGET_STATE_ROLE_DENIED" });
  if (target && protectedStates.has(target) && !reportingDecisionRoles.has(input.decision.reviewerRole)) throw Object.assign(new Error("This target state requires an authorized specialist reviewer."), { status: 403, code: "PROTECTED_STATE_REVIEWER_REQUIRED" });
  if (target === "submitted" && !input.approvedPackageId) throw Object.assign(new Error("Submitted state requires a linked approved evidence package and submission record."), { status: 409, code: "APPROVED_PACKAGE_REQUIRED" });
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
  if (input.deadline && (!input.ruleSource || !input.rationale || !input.timezone || !input.approvedBy)) throw Object.assign(new Error("A deadline requires its rule source, calculation rationale, timezone, and approval."), { status: 400, code: "DEADLINE_RATIONALE_REQUIRED" });
  return input;
}
