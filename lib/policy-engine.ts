export type TrustAssuranceLevel = "standard" | "elevated" | "high";
export type WorkflowPolicyType =
  | "candidate"
  | "executive"
  | "session"
  | "high_assurance"
  | "general";

export type TrustPolicy = {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowPolicyType;
  enabled: boolean;
  assuranceLevel: TrustAssuranceLevel;
  escalationThreshold: number;
  highAssuranceThreshold: number;
  providerConfidenceMinimum: number;
  sessionIntegrityMinimum: number;
  trustDecayDays: number;
  replayRetentionDays: number;
  providerWeights: Record<string, number>;
  reviewerQueue: string;
  assignedReviewer: string;
  sessionAnomalyHandling: "continue_with_review" | "hold_for_human_review";
  humanApprovalRequired: true;
};

export type PolicyEvaluationInput = {
  workflowId: string;
  workflowType: WorkflowPolicyType;
  trustScore: number;
  providerConfidence: number;
  sessionIntegrity: number;
  daysSinceLastEvidence: number;
  anomalyCount: number;
  evidenceReferences: string[];
};

export type PolicyTrigger = {
  code: string;
  policyId: string;
  threshold: number;
  observed: number;
  explanation: string;
  evidenceReferences: string[];
};

export type PolicyRoute =
  | "continue_with_oversight"
  | "governance_review"
  | "high_assurance_review"
  | "hold_for_human_decision";

export type PolicyEvaluation = {
  workflowId: string;
  policyId: string;
  policyName: string;
  route: PolicyRoute;
  assuranceLevel: TrustAssuranceLevel;
  triggers: PolicyTrigger[];
  explanation: string;
  governanceRouting: {
    reviewerQueue: string;
    assignedReviewer: string;
    ownershipStatus: "assigned";
    humanReviewRequired: true;
  };
  replayContext: {
    policyTriggered: string;
    whyEscalated: string;
    thresholdChanges: string[];
    resolutionRequired: string;
    evidenceReferences: string[];
  };
  auditContext: {
    eventType: "operational_trust_policy_evaluated";
    humanReviewRemainsAuthoritative: true;
    automaticPunitiveDecision: false;
  };
};

export type EnterprisePolicyTemplate = {
  id: string;
  name: "AI Operations" | "Financial Services" | "Insurance" | "Healthcare" | "Critical Infrastructure" | "General Enterprise" | "Hiring";
  purpose: string;
  trustThresholds: Pick<TrustPolicy, "escalationThreshold" | "highAssuranceThreshold" | "providerConfidenceMinimum" | "sessionIntegrityMinimum">;
  escalationPath: readonly string[];
  reviewRequirements: readonly string[];
  evidenceRequirements: readonly string[];
  policy: TrustPolicy;
};

export const POLICY_ENGINE_BOUNDARY = {
  explainable: true,
  humanReviewable: true,
  auditable: true,
  automaticAccusation: false,
  automaticPunitiveDecision: false,
  biometricCertainty: false,
} as const;

function bounded(value: number, minimum = 0, maximum = 100) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function nonnegative(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export const defaultTrustPolicies: TrustPolicy[] = [
  {
    id: "candidate-high-risk",
    name: "High-risk candidate workflow",
    description: "Routes elevated candidate workflows to named human review with replayable evidence.",
    workflowType: "candidate",
    enabled: true,
    assuranceLevel: "elevated",
    escalationThreshold: 68,
    highAssuranceThreshold: 52,
    providerConfidenceMinimum: 70,
    sessionIntegrityMinimum: 65,
    trustDecayDays: 30,
    replayRetentionDays: 365,
    providerWeights: { identity: 35, session: 25, provenance: 20, device: 20 },
    reviewerQueue: "Hiring Security Review",
    assignedReviewer: "Hiring trust lead",
    sessionAnomalyHandling: "hold_for_human_review",
    humanApprovalRequired: true,
  },
  {
    id: "executive-verification",
    name: "Executive verification requirements",
    description: "Requires elevated assurance and accountable approval for executive-access workflows.",
    workflowType: "executive",
    enabled: true,
    assuranceLevel: "high",
    escalationThreshold: 78,
    highAssuranceThreshold: 64,
    providerConfidenceMinimum: 82,
    sessionIntegrityMinimum: 78,
    trustDecayDays: 14,
    replayRetentionDays: 730,
    providerWeights: { identity: 40, session: 30, provenance: 20, device: 10 },
    reviewerQueue: "Executive Assurance",
    assignedReviewer: "Enterprise security reviewer",
    sessionAnomalyHandling: "hold_for_human_review",
    humanApprovalRequired: true,
  },
  {
    id: "session-integrity",
    name: "Session integrity enforcement",
    description: "Keeps session anomalies visible and routes unresolved continuity changes to review.",
    workflowType: "session",
    enabled: true,
    assuranceLevel: "elevated",
    escalationThreshold: 65,
    highAssuranceThreshold: 48,
    providerConfidenceMinimum: 60,
    sessionIntegrityMinimum: 75,
    trustDecayDays: 7,
    replayRetentionDays: 365,
    providerWeights: { identity: 15, session: 50, provenance: 15, device: 20 },
    reviewerQueue: "Session Integrity Review",
    assignedReviewer: "Trust operations reviewer",
    sessionAnomalyHandling: "hold_for_human_review",
    humanApprovalRequired: true,
  },
  {
    id: "high-assurance-approval",
    name: "High-assurance workflow approval",
    description: "Applies stricter evidence and provider thresholds before a human approval can be recorded.",
    workflowType: "high_assurance",
    enabled: true,
    assuranceLevel: "high",
    escalationThreshold: 82,
    highAssuranceThreshold: 70,
    providerConfidenceMinimum: 85,
    sessionIntegrityMinimum: 82,
    trustDecayDays: 7,
    replayRetentionDays: 730,
    providerWeights: { identity: 35, session: 30, provenance: 25, device: 10 },
    reviewerQueue: "High Assurance Review",
    assignedReviewer: "CISO delegate",
    sessionAnomalyHandling: "hold_for_human_review",
    humanApprovalRequired: true,
  },
  {
    id: "provider-confidence",
    name: "Provider confidence minimums",
    description: "Routes weak or unstable provider evidence for review without treating it as a final verdict.",
    workflowType: "general",
    enabled: true,
    assuranceLevel: "standard",
    escalationThreshold: 62,
    highAssuranceThreshold: 45,
    providerConfidenceMinimum: 72,
    sessionIntegrityMinimum: 60,
    trustDecayDays: 45,
    replayRetentionDays: 365,
    providerWeights: { identity: 40, session: 20, provenance: 25, device: 15 },
    reviewerQueue: "Provider Evidence Review",
    assignedReviewer: "Verification operations reviewer",
    sessionAnomalyHandling: "continue_with_review",
    humanApprovalRequired: true,
  },
];

function enterprisePolicyTemplate(
  id: EnterprisePolicyTemplate["id"],
  name: EnterprisePolicyTemplate["name"],
  purpose: string,
  policy: TrustPolicy,
  escalationPath: readonly string[],
  evidenceRequirements: readonly string[]
): EnterprisePolicyTemplate {
  return {
    id,
    name,
    purpose,
    trustThresholds: {
      escalationThreshold: policy.escalationThreshold,
      highAssuranceThreshold: policy.highAssuranceThreshold,
      providerConfidenceMinimum: policy.providerConfidenceMinimum,
      sessionIntegrityMinimum: policy.sessionIntegrityMinimum,
    },
    escalationPath,
    reviewRequirements: [
      `Named reviewer: ${policy.assignedReviewer}`,
      `Queue: ${policy.reviewerQueue}`,
      "Human approval remains authoritative",
      "Outcome and rationale must be retained in Replay",
    ],
    evidenceRequirements,
    policy,
  };
}

const generalPolicy = defaultTrustPolicies.find((policy) => policy.id === "provider-confidence")!;
const elevatedPolicy = defaultTrustPolicies.find((policy) => policy.id === "candidate-high-risk")!;
const highAssurancePolicy = defaultTrustPolicies.find((policy) => policy.id === "high-assurance-approval")!;
const sessionPolicy = defaultTrustPolicies.find((policy) => policy.id === "session-integrity")!;

export const enterprisePolicyTemplates: readonly EnterprisePolicyTemplate[] = [
  enterprisePolicyTemplate("ai-operations", "AI Operations", "Govern AI-agent actions, delegated authority and runtime evidence.", highAssurancePolicy, ["AI operations owner", "Security reviewer", "Governance approval"], ["Agent identity", "Authority grant", "Runtime context", "Action intent", "Provider evidence"]),
  enterprisePolicyTemplate("financial-services", "Financial Services", "Apply high-assurance controls to regulated financial decisions.", highAssurancePolicy, ["Risk owner", "Compliance reviewer", "CISO delegate"], ["Identity evidence", "Transaction context", "Authority mandate", "Session integrity", "Decision receipt"]),
  enterprisePolicyTemplate("insurance", "Insurance", "Retain explainable evidence and reviewer ownership for insurance workflows.", elevatedPolicy, ["Claims owner", "Fraud review", "Governance approval"], ["Subject identity", "Claim evidence", "Provenance", "Provider findings", "Reviewer outcome"]),
  enterprisePolicyTemplate("healthcare", "Healthcare", "Protect high-sensitivity workflows while keeping human clinical authority outside automated decisions.", highAssurancePolicy, ["Workflow owner", "Privacy or security reviewer", "Authorized human decision"], ["Identity evidence", "Purpose and consent", "Minimum necessary workflow context", "Session integrity", "Audit receipt"]),
  enterprisePolicyTemplate("critical-infrastructure", "Critical Infrastructure", "Require strong authority and session continuity before high-impact operational actions.", sessionPolicy, ["Operations owner", "Security operations", "Named incident authority"], ["Machine identity", "Human authority", "Device or channel integrity", "Action intent", "Replay reference"]),
  enterprisePolicyTemplate("general-enterprise", "General Enterprise", "Start a governed enterprise pilot with explainable thresholds and named review.", generalPolicy, ["Workflow owner", "Trust operations reviewer"], ["Identity evidence", "Purpose", "Provider evidence", "Policy result", "Reviewer outcome"]),
  enterprisePolicyTemplate("hiring", "Hiring", "Run one governed hiring-security workflow with evidence and human review.", elevatedPolicy, ["Hiring trust lead", "HR or security reviewer"], ["Candidate identity", "Session integrity", "Evidence provenance", "Provider findings", "Human outcome"]),
] as const;

export function validateTrustPolicy(policy: TrustPolicy) {
  const errors: string[] = [];
  if (!policy.id.trim()) errors.push("Policy ID is required.");
  if (!policy.name.trim()) errors.push("Policy name is required.");
  if (!policy.reviewerQueue.trim()) errors.push("Reviewer queue is required.");
  if (!policy.assignedReviewer.trim()) errors.push("Assigned reviewer is required.");
  if (policy.highAssuranceThreshold > policy.escalationThreshold) {
    errors.push("High-assurance threshold must not exceed the escalation threshold.");
  }
  for (const [label, value] of [
    ["Escalation threshold", policy.escalationThreshold],
    ["High-assurance threshold", policy.highAssuranceThreshold],
    ["Provider confidence minimum", policy.providerConfidenceMinimum],
    ["Session integrity minimum", policy.sessionIntegrityMinimum],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors.push(`${label} must be between 0 and 100.`);
    }
  }
  if (!Number.isFinite(policy.trustDecayDays) || policy.trustDecayDays < 1) {
    errors.push("Trust decay timing must be at least one day.");
  }
  if (!Number.isFinite(policy.replayRetentionDays) || policy.replayRetentionDays < 1) {
    errors.push("Replay retention must be at least one day.");
  }
  const providerWeightTotal = Object.values(policy.providerWeights).reduce(
    (total, value) => total + bounded(value),
    0
  );
  if (providerWeightTotal !== 100) {
    errors.push("Provider trust weighting must total 100.");
  }
  if (!policy.humanApprovalRequired) {
    errors.push("Human approval must remain required.");
  }
  return { valid: errors.length === 0, errors };
}

export function evaluateTrustPolicy(
  policy: TrustPolicy,
  rawInput: PolicyEvaluationInput
): PolicyEvaluation {
  const validation = validateTrustPolicy(policy);
  if (!validation.valid) {
    throw new Error(`Invalid trust policy: ${validation.errors.join(" ")}`);
  }
  const input = {
    ...rawInput,
    trustScore: bounded(rawInput.trustScore),
    providerConfidence: bounded(rawInput.providerConfidence),
    sessionIntegrity: bounded(rawInput.sessionIntegrity),
    daysSinceLastEvidence: nonnegative(rawInput.daysSinceLastEvidence),
    anomalyCount: nonnegative(rawInput.anomalyCount),
    evidenceReferences: unique(rawInput.evidenceReferences),
  };
  const triggers: PolicyTrigger[] = [];
  const addTrigger = (
    code: string,
    threshold: number,
    observed: number,
    explanation: string
  ) => {
    triggers.push({
      code,
      policyId: policy.id,
      threshold,
      observed,
      explanation,
      evidenceReferences: input.evidenceReferences,
    });
  };
  if (policy.enabled && input.trustScore < policy.escalationThreshold) {
    addTrigger(
      "trust_below_escalation_threshold",
      policy.escalationThreshold,
      input.trustScore,
      `Workflow trust posture ${input.trustScore} is below the configured review threshold ${policy.escalationThreshold}.`
    );
  }
  if (policy.enabled && input.providerConfidence < policy.providerConfidenceMinimum) {
    addTrigger(
      "provider_confidence_below_minimum",
      policy.providerConfidenceMinimum,
      input.providerConfidence,
      `Provider evidence ${input.providerConfidence} is below the configured minimum ${policy.providerConfidenceMinimum}.`
    );
  }
  if (policy.enabled && input.sessionIntegrity < policy.sessionIntegrityMinimum) {
    addTrigger(
      "session_integrity_below_minimum",
      policy.sessionIntegrityMinimum,
      input.sessionIntegrity,
      `Session integrity ${input.sessionIntegrity} is below the configured minimum ${policy.sessionIntegrityMinimum}.`
    );
  }
  if (policy.enabled && input.daysSinceLastEvidence > policy.trustDecayDays) {
    addTrigger(
      "trust_evidence_decay_due",
      policy.trustDecayDays,
      input.daysSinceLastEvidence,
      `The latest evidence is ${input.daysSinceLastEvidence} day(s) old; policy review is due after ${policy.trustDecayDays}.`
    );
  }
  if (policy.enabled && input.anomalyCount > 0) {
    addTrigger(
      "workflow_anomalies_require_context",
      0,
      input.anomalyCount,
      `${input.anomalyCount} workflow anomaly event(s) require reviewer context; they are not automatic accusations.`
    );
  }
  const severeThreshold =
    input.trustScore < policy.highAssuranceThreshold ||
    (input.sessionIntegrity < policy.sessionIntegrityMinimum &&
      policy.sessionAnomalyHandling === "hold_for_human_review");
  const route: PolicyRoute = severeThreshold
    ? "hold_for_human_decision"
    : policy.assuranceLevel === "high" && triggers.length
      ? "high_assurance_review"
      : triggers.length
        ? "governance_review"
        : "continue_with_oversight";
  const reasons = triggers.map((trigger) => trigger.explanation);
  const explanation = !policy.enabled
    ? `${policy.name} is disabled. No routing threshold was applied; existing governance oversight remains in place.`
    : triggers.length
      ? `${policy.name} routed this workflow to ${route.replaceAll("_", " ")} because ${reasons.join(" ")}`
      : `${policy.name} found no configured review threshold crossing. Normal oversight and replay retention continue.`;

  return {
    workflowId: input.workflowId,
    policyId: policy.id,
    policyName: policy.name,
    route,
    assuranceLevel: policy.assuranceLevel,
    triggers,
    explanation,
    governanceRouting: {
      reviewerQueue: policy.reviewerQueue,
      assignedReviewer: policy.assignedReviewer,
      ownershipStatus: "assigned",
      humanReviewRequired: true,
    },
    replayContext: {
      policyTriggered: policy.name,
      whyEscalated: reasons.join(" ") || "No escalation threshold crossed.",
      thresholdChanges: triggers.map(
        (trigger) =>
          `${trigger.code}: observed ${trigger.observed}, configured threshold ${trigger.threshold}`
      ),
      resolutionRequired:
        route === "continue_with_oversight"
          ? "Retain evidence and continue normal governance oversight."
          : `A named reviewer in ${policy.reviewerQueue} must record the governance outcome.`,
      evidenceReferences: input.evidenceReferences,
    },
    auditContext: {
      eventType: "operational_trust_policy_evaluated",
      humanReviewRemainsAuthoritative: true,
      automaticPunitiveDecision: false,
    },
  };
}
