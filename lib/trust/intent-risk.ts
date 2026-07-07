export type IntentActorType = "human" | "agent" | "NHI" | "workflow";
export type IntentRecommendation = "allow" | "review" | "escalate" | "block";
export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";
export type WorkflowCriticality = "low" | "medium" | "high" | "critical";

export type IntentRiskInput = {
  actorType: IntentActorType;
  actionType: string;
  declaredIntent?: string | null;
  expectedPermission?: string | null;
  actualPermission?: string | null;
  dataSensitivity?: DataSensitivity;
  workflowCriticality?: WorkflowCriticality;
  anomalyReason?: string | null;
  delegatedAuthorityActive?: boolean;
  humanOwnerPresent?: boolean;
  actionBeforeExecution?: boolean;
};

export type IntentRiskAssessment = {
  source: "Heuristic Baseline";
  modelLabel: "intent-aware heuristic/risk scoring";
  actorType: IntentActorType;
  actionType: string;
  riskScore: number;
  riskBand: "low" | "medium" | "high" | "critical";
  recommendation: IntentRecommendation;
  evidence: string[];
  escalationReason: string | null;
  limitations: string[];
  auditTimeline: Array<{
    stage: "declared_intent" | "authority_check" | "sensitivity_check" | "anomaly_review" | "recommendation";
    summary: string;
  }>;
};

const sensitivityWeight: Record<DataSensitivity, number> = {
  public: 5,
  internal: 15,
  confidential: 25,
  restricted: 35,
};

const criticalityWeight: Record<WorkflowCriticality, number> = {
  low: 5,
  medium: 15,
  high: 25,
  critical: 35,
};

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function evaluateIntentRisk(input: IntentRiskInput): IntentRiskAssessment {
  const dataSensitivity = input.dataSensitivity ?? "internal";
  const workflowCriticality = input.workflowCriticality ?? "medium";
  const declaredIntent = normalizeText(input.declaredIntent, "No declared intent supplied");
  const expectedPermission = normalizeText(input.expectedPermission, "No expected permission supplied");
  const actualPermission = normalizeText(input.actualPermission, expectedPermission);
  const permissionMismatch = expectedPermission !== actualPermission;
  const anomalyReason = normalizeText(input.anomalyReason, "");
  const delegatedAuthorityMissing = input.delegatedAuthorityActive === false;
  const ownerMissing = input.actorType !== "human" && input.humanOwnerPresent === false;

  const baseRisk =
    sensitivityWeight[dataSensitivity] +
    criticalityWeight[workflowCriticality] +
    (input.actorType === "agent" ? 10 : 0) +
    (input.actorType === "NHI" ? 15 : 0) +
    (permissionMismatch ? 20 : 0) +
    (delegatedAuthorityMissing ? 20 : 0) +
    (ownerMissing ? 15 : 0) +
    (input.actionBeforeExecution ? 10 : 0) +
    (anomalyReason ? 15 : 0);
  const riskScore = boundedScore(baseRisk);
  const riskBand =
    riskScore >= 85 ? "critical" : riskScore >= 65 ? "high" : riskScore >= 35 ? "medium" : "low";
  const recommendation: IntentRecommendation =
    riskScore >= 85 ? "block" : riskScore >= 65 ? "escalate" : riskScore >= 35 ? "review" : "allow";
  const evidence = [
    `${input.actorType} requested ${input.actionType}`,
    `Declared intent: ${declaredIntent}`,
    `Expected permission: ${expectedPermission}`,
    `Actual permission: ${actualPermission}`,
    `Data sensitivity: ${dataSensitivity}`,
    `Workflow criticality: ${workflowCriticality}`,
    permissionMismatch ? "Permission mismatch detected before execution." : "Requested action matches expected permission.",
    delegatedAuthorityMissing ? "Delegated authority is missing or expired." : "Delegated authority is active or not required.",
    ownerMissing ? "No accountable human owner was supplied for the non-human actor." : "Accountable ownership context is present or not required.",
    anomalyReason ? `Anomaly reason: ${anomalyReason}` : "No anomaly reason supplied.",
  ];

  return {
    source: "Heuristic Baseline",
    modelLabel: "intent-aware heuristic/risk scoring",
    actorType: input.actorType,
    actionType: input.actionType,
    riskScore,
    riskBand,
    recommendation,
    evidence,
    escalationReason:
      recommendation === "allow"
        ? null
        : anomalyReason || permissionMismatch || delegatedAuthorityMissing || ownerMissing
          ? "Intent, authority or ownership context requires governance review before execution."
          : "Risk band exceeds the configured review threshold.",
    limitations: [
      "Intent risk is deterministic heuristic scoring, not confirmed ML.",
      "Declared intent may be incomplete or inaccurate and must be reviewed with evidence.",
      "A low score does not approve an action outside enterprise policy.",
    ],
    auditTimeline: [
      { stage: "declared_intent", summary: declaredIntent },
      { stage: "authority_check", summary: `Expected ${expectedPermission}; observed ${actualPermission}.` },
      { stage: "sensitivity_check", summary: `${dataSensitivity} data in a ${workflowCriticality} workflow.` },
      { stage: "anomaly_review", summary: anomalyReason || "No anomaly reason supplied." },
      { stage: "recommendation", summary: `${recommendation} with ${riskBand} risk.` },
    ],
  };
}
