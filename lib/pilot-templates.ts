export type OperationalPilotTemplate = {
  id:
    | "hiring_security"
    | "executive_approval"
    | "enterprise_onboarding"
    | "session_integrity"
    | "governance_escalation";
  name: string;
  purpose: string;
  workflowStart: string;
  trustEvolution: string;
  replayChronology: string;
  governanceIntervention: string;
  finalOutcome: string;
  evidenceExpected: string[];
};

export const operationalPilotTemplates: OperationalPilotTemplate[] = [
  {
    id: "hiring_security",
    name: "Hiring security",
    purpose: "Review candidate identity, interview continuity and hiring evidence before a sensitive decision advances.",
    workflowStart: "Candidate and role context enter an isolated hiring workflow.",
    trustEvolution: "Identity, evidence completeness and session-integrity changes remain separate and visible.",
    replayChronology: "Replay orders candidate intake, provider evidence, interview signals and reviewer actions.",
    governanceIntervention: "Unresolved identity or session risk opens a named human review.",
    finalOutcome: "A workflow-linked receipt records the review outcome and remaining limitations.",
    evidenceExpected: ["Candidate context", "Provider verification", "Session integrity", "Reviewer notes"],
  },
  {
    id: "executive_approval",
    name: "Executive approval workflow",
    purpose: "Keep high-impact approvals tied to identity, authority, evidence and accountable review.",
    workflowStart: "A named approval request is linked to its requester, scope and business purpose.",
    trustEvolution: "Authorization and evidence continuity update as approvers and supporting records change.",
    replayChronology: "Replay reconstructs request creation, evidence changes, approvals and exceptions.",
    governanceIntervention: "Scope changes or missing authority route to an assigned reviewer.",
    finalOutcome: "The receipt summarizes the approval path, authorization lineage and final disposition.",
    evidenceExpected: ["Requester identity", "Approval scope", "Authorization lineage", "Decision rationale"],
  },
  {
    id: "enterprise_onboarding",
    name: "Enterprise onboarding",
    purpose: "Review organizational, user and access evidence through one controlled onboarding chronology.",
    workflowStart: "Organization, workspace owner and requested access are recorded.",
    trustEvolution: "Provider evidence, account verification and evidence completeness update onboarding posture.",
    replayChronology: "Replay links intake, verification, access review and onboarding decisions.",
    governanceIntervention: "Missing ownership or verification evidence pauses onboarding for review.",
    finalOutcome: "A receipt records what was verified, approved, deferred or still required.",
    evidenceExpected: ["Organization context", "Workspace owner", "Provider evidence", "Access review"],
  },
  {
    id: "session_integrity",
    name: "Session integrity review",
    purpose: "Evaluate how trust changes after a verified workflow session begins.",
    workflowStart: "A verified subject enters a named session.",
    trustEvolution: "Device, channel, liveness and interruption signals update session context without becoming verdicts.",
    replayChronology: "Replay aligns session changes, provider evidence and analyst notes by timestamp.",
    governanceIntervention: "Repeated or high-risk anomalies open evidence-aware human review.",
    finalOutcome: "The receipt separates identity state, session integrity and governance outcome.",
    evidenceExpected: ["Session reference", "Device continuity", "Integrity signals", "Analyst notes"],
  },
  {
    id: "governance_escalation",
    name: "Governance escalation",
    purpose: "Demonstrate accountable escalation, reviewer ownership and resolution continuity.",
    workflowStart: "A workflow exception or unresolved trust change opens an escalation.",
    trustEvolution: "Posture remains review-gated while evidence requests and reviewer actions accumulate.",
    replayChronology: "Replay preserves escalation reason, assignments, evidence and state transitions.",
    governanceIntervention: "A named reviewer approves, rejects, restricts or requests evidence.",
    finalOutcome: "The receipt records the governed outcome and replay reference.",
    evidenceExpected: ["Escalation reason", "Reviewer assignment", "Evidence request", "Resolution notes"],
  },
];

export function getOperationalPilotTemplate(value: unknown) {
  const id = String(value ?? "");
  return operationalPilotTemplates.find((template) => template.id === id)
    ?? operationalPilotTemplates[0];
}

