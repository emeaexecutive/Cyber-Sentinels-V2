import {
  calculateTransparentTrustScore,
  type GovernanceReviewState,
  type ProviderVerificationState,
  type TransparentTrustScoreInput,
  type TrustScoreRiskFlag,
} from "@/lib/trust-score";
import {
  normalizeProviderSignal,
  summarizeProviderSignals,
  type VerificationProviderSignal,
} from "@/lib/providers";

export type TestSignalCategory =
  | "identity_confidence"
  | "provider_verification"
  | "session_integrity"
  | "behavioral_consistency"
  | "evidence_completeness"
  | "governance_review_state";

export type ProviderValidation = {
  provider: string;
  status: ProviderVerificationState;
  latencyMs: number | null;
  confidence: number | null;
  missingEvidence: string[];
};

export type ValidationScenario = {
  id: string;
  label: string;
  scenarioType:
    | "verified_human"
    | "synthetic_identity"
    | "vpn_session"
    | "injected_session"
    | "proxy_interview"
    | "missing_evidence"
    | "failed_provider_signal"
    | "governance_escalation";
  summary: string;
  input: Omit<TransparentTrustScoreInput, "providerSignals"> & {
    behavioralConsistency: number;
  };
  providerSignals: VerificationProviderSignal[];
  providerValidation: ProviderValidation;
  expectedTrigger: string;
  triggerReason: string;
  evidenceUsed: string[];
  reviewerAction: string;
  workflowOutcome: string;
};

export type SignalContribution = {
  category: TestSignalCategory;
  label: string;
  rawValue: number | string;
  contribution: number;
  notes: string;
};

export type ScenarioResult = {
  scenario: ValidationScenario;
  score: number;
  level: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  scoreContributions: SignalContribution[];
  triggeredFlags: string[];
  escalationReasons: string[];
  workflowOutcome: string;
  evidenceGenerated: string[];
  replayValidation: {
    whatTriggered: string;
    whyTriggered: string;
    evidenceUsed: string[];
    reviewerActions: string;
    trustScoreChange: string;
  };
  providerValidation: ProviderValidation;
};

function providerSignal(
  providerVerificationState: ProviderVerificationState,
  identityConfidence: number,
  sessionIntegrity: number,
  riskFlags: TrustScoreRiskFlag[] = [],
  providerName = "External verification source"
) {
  return normalizeProviderSignal({
    providerId: "hopae_connect",
    providerName,
    sourceType: "provider_signal",
    providerVerificationState,
    identityConfidence,
    sessionIntegrity,
    riskFlags,
    governanceRecommendation:
      "Use this provider signal as verification evidence; governance review determines the final workflow state.",
    evidenceReferences: [
      "Provider signal",
      "Verification evidence",
      "Replay chronology",
      "Governance review",
    ],
  });
}

export const validationScenarios: ValidationScenario[] = [
  {
    id: "verified-human",
    label: "Verified human",
    scenarioType: "verified_human",
    summary: "Stable identity, complete evidence, provider signal present and governance approved.",
    input: {
      identityConfidence: 88,
      sessionIntegrity: 90,
      behavioralConsistency: 86,
      evidenceCompleteness: 90,
      governanceReview: "approved",
      providerVerification: "verified",
      riskFlags: [],
    },
    providerSignals: [providerSignal("verified", 88, 90, [], "Hopae Connect")],
    providerValidation: {
      provider: "Hopae Connect",
      status: "verified",
      latencyMs: 420,
      confidence: 88,
      missingEvidence: [],
    },
    expectedTrigger: "No risk trigger",
    triggerReason: "Identity, provider and evidence states are present for reviewer confirmation.",
    evidenceUsed: ["Provider signal", "Evidence completeness marker", "Governance approval", "Receipt evidence"],
    reviewerAction: "Approve workflow outcome and retain receipt evidence.",
    workflowOutcome: "Proceed with reviewable verification receipt.",
  },
  {
    id: "synthetic-identity",
    label: "Synthetic identity",
    scenarioType: "synthetic_identity",
    summary: "Identity confidence and behavior consistency are low enough to require review.",
    input: {
      identityConfidence: 34,
      sessionIntegrity: 62,
      behavioralConsistency: 32,
      evidenceCompleteness: 58,
      governanceReview: "escalated",
      providerVerification: "pending",
      riskFlags: ["high_risk_context"],
    },
    providerSignals: [providerSignal("pending", 42, 62, ["high_risk_context"], "World ID")],
    providerValidation: {
      provider: "World ID",
      status: "pending",
      latencyMs: 860,
      confidence: 42,
      missingEvidence: ["Provider proof not completed"],
    },
    expectedTrigger: "Synthetic identity review",
    triggerReason: "Low identity confidence and incomplete provider evidence require governance review.",
    evidenceUsed: ["Identity confidence score", "Provider pending state", "Behavioral consistency marker"],
    reviewerAction: "Escalate identity evidence before workflow advances.",
    workflowOutcome: "Governance review required.",
  },
  {
    id: "vpn-session",
    label: "VPN session",
    scenarioType: "vpn_session",
    summary: "Session integrity is reduced by network context while identity evidence remains reviewable.",
    input: {
      identityConfidence: 78,
      sessionIntegrity: 54,
      behavioralConsistency: 70,
      evidenceCompleteness: 76,
      governanceReview: "pending",
      providerVerification: "verified",
      riskFlags: ["session_integrity_anomaly"],
    },
    providerSignals: [providerSignal("verified", 78, 54, ["session_integrity_anomaly"], "Fingerprint / device risk")],
    providerValidation: {
      provider: "Fingerprint / device risk",
      status: "verified",
      latencyMs: 210,
      confidence: 54,
      missingEvidence: [],
    },
    expectedTrigger: "Session integrity review",
    triggerReason: "Network context changed during the workflow.",
    evidenceUsed: ["Device risk signal", "Session integrity marker", "Replay chronology"],
    reviewerAction: "Review session context before final approval.",
    workflowOutcome: "Continue with reviewer confirmation.",
  },
  {
    id: "injected-session",
    label: "Injected session",
    scenarioType: "injected_session",
    summary: "Channel manipulation or injected feed risk reduces session integrity.",
    input: {
      identityConfidence: 72,
      sessionIntegrity: 30,
      behavioralConsistency: 50,
      evidenceCompleteness: 70,
      governanceReview: "escalated",
      providerVerification: "pending",
      riskFlags: ["session_integrity_anomaly", "injection_risk"],
    },
    providerSignals: [providerSignal("pending", 70, 30, ["session_integrity_anomaly", "injection_risk"], "Cloudflare Turnstile")],
    providerValidation: {
      provider: "Cloudflare Turnstile",
      status: "pending",
      latencyMs: 310,
      confidence: 30,
      missingEvidence: ["Channel integrity confirmation"],
    },
    expectedTrigger: "Injection risk",
    triggerReason: "Session integrity anomaly and injection risk were triggered.",
    evidenceUsed: ["Session integrity event", "Injection-risk flag", "Provider signal"],
    reviewerAction: "Escalate before workflow outcome is issued.",
    workflowOutcome: "Blocked until governance review.",
  },
  {
    id: "proxy-interview",
    label: "Proxy interview",
    scenarioType: "proxy_interview",
    summary: "Candidate context and interview behavior do not align cleanly.",
    input: {
      identityConfidence: 58,
      sessionIntegrity: 46,
      behavioralConsistency: 38,
      evidenceCompleteness: 64,
      governanceReview: "escalated",
      providerVerification: "none",
      riskFlags: ["proxy_candidate_risk", "high_risk_context"],
    },
    providerSignals: [providerSignal("none", 58, 46, ["proxy_candidate_risk"], "External verification source")],
    providerValidation: {
      provider: "External verification source",
      status: "none",
      latencyMs: null,
      confidence: null,
      missingEvidence: ["No provider verification attached"],
    },
    expectedTrigger: "Proxy candidate risk",
    triggerReason: "Behavioral consistency and session integrity diverged from candidate context.",
    evidenceUsed: ["Behavioral consistency marker", "Session integrity marker", "Reviewer notes"],
    reviewerAction: "Request additional evidence and reviewer confirmation.",
    workflowOutcome: "Governance review required.",
  },
  {
    id: "missing-evidence",
    label: "Missing evidence",
    scenarioType: "missing_evidence",
    summary: "Evidence completeness is too low for a final workflow outcome.",
    input: {
      identityConfidence: 70,
      sessionIntegrity: 72,
      behavioralConsistency: 68,
      evidenceCompleteness: 28,
      governanceReview: "pending",
      providerVerification: "none",
      riskFlags: ["missing_evidence"],
    },
    providerSignals: [providerSignal("none", 70, 72, ["missing_evidence"], "External verification source")],
    providerValidation: {
      provider: "External verification source",
      status: "none",
      latencyMs: null,
      confidence: null,
      missingEvidence: ["Identity document", "Provider result", "Reviewer evidence note"],
    },
    expectedTrigger: "Missing evidence",
    triggerReason: "Required verification evidence is absent or incomplete.",
    evidenceUsed: ["Evidence completeness marker", "Missing provider evidence list"],
    reviewerAction: "Request evidence before approving workflow outcome.",
    workflowOutcome: "Pending evidence.",
  },
  {
    id: "failed-provider-signal",
    label: "Failed provider signal",
    scenarioType: "failed_provider_signal",
    summary: "Provider verification failed and must be reviewed as evidence.",
    input: {
      identityConfidence: 62,
      sessionIntegrity: 66,
      behavioralConsistency: 60,
      evidenceCompleteness: 72,
      governanceReview: "escalated",
      providerVerification: "failed",
      riskFlags: ["provider_failed"],
    },
    providerSignals: [providerSignal("failed", 42, 58, ["provider_failed"], "Stripe Identity")],
    providerValidation: {
      provider: "Stripe Identity",
      status: "failed",
      latencyMs: 740,
      confidence: 42,
      missingEvidence: ["Provider pass result"],
    },
    expectedTrigger: "Provider failure",
    triggerReason: "External provider state returned failed or declined.",
    evidenceUsed: ["Provider failure signal", "Governance escalation reason", "Replay chronology"],
    reviewerAction: "Escalate provider failure and prevent automatic approval.",
    workflowOutcome: "Blocked pending governance review.",
  },
  {
    id: "governance-escalation",
    label: "Governance escalation",
    scenarioType: "governance_escalation",
    summary: "Multiple moderate signals combine into a governance review path.",
    input: {
      identityConfidence: 68,
      sessionIntegrity: 60,
      behavioralConsistency: 58,
      evidenceCompleteness: 66,
      governanceReview: "escalated",
      providerVerification: "pending",
      riskFlags: ["high_risk_context"],
    },
    providerSignals: [providerSignal("pending", 68, 60, ["high_risk_context"], "Persona")],
    providerValidation: {
      provider: "Persona",
      status: "pending",
      latencyMs: 980,
      confidence: 68,
      missingEvidence: ["Provider inquiry completion"],
    },
    expectedTrigger: "Governance escalation",
    triggerReason: "Combined provider, evidence and workflow context requires reviewer ownership.",
    evidenceUsed: ["Provider pending state", "Evidence completeness marker", "Risk flag summary"],
    reviewerAction: "Assign reviewer and record governance outcome.",
    workflowOutcome: "Escalated for human review.",
  },
];

const weights = {
  identity_confidence: 0.24,
  provider_verification: 0.12,
  session_integrity: 0.24,
  behavioral_consistency: 0,
  evidence_completeness: 0.2,
  governance_review_state: 0.2,
};

function contribution(value: number, weight: number) {
  return Math.round(value * weight);
}

function governanceValue(state: GovernanceReviewState) {
  if (state === "approved") return 90;
  if (state === "rejected") return 15;
  if (state === "escalated") return 35;
  if (state === "pending") return 55;
  return 45;
}

function providerValue(state: ProviderVerificationState) {
  if (state === "verified") return 90;
  if (state === "failed") return 20;
  if (state === "pending") return 55;
  return 50;
}

function buildContributions(scenario: ValidationScenario, providerState: ProviderVerificationState): SignalContribution[] {
  return [
    {
      category: "identity_confidence",
      label: "Identity confidence",
      rawValue: scenario.input.identityConfidence,
      contribution: contribution(scenario.input.identityConfidence, weights.identity_confidence),
      notes: "Rule-based identity context score used for workflow review.",
    },
    {
      category: "provider_verification",
      label: "Provider verification",
      rawValue: providerState,
      contribution: contribution(providerValue(providerState), weights.provider_verification),
      notes: "External provider state is evidence, not final truth.",
    },
    {
      category: "session_integrity",
      label: "Session integrity",
      rawValue: scenario.input.sessionIntegrity,
      contribution: contribution(scenario.input.sessionIntegrity, weights.session_integrity),
      notes: "Session, channel and device context for replay review.",
    },
    {
      category: "behavioral_consistency",
      label: "Behavioral consistency",
      rawValue: scenario.input.behavioralConsistency,
      contribution: 0,
      notes: "Measured as review context; not currently weighted into MVP trust score.",
    },
    {
      category: "evidence_completeness",
      label: "Evidence completeness",
      rawValue: scenario.input.evidenceCompleteness,
      contribution: contribution(scenario.input.evidenceCompleteness, weights.evidence_completeness),
      notes: "Evidence availability for receipts and replay.",
    },
    {
      category: "governance_review_state",
      label: "Governance review state",
      rawValue: scenario.input.governanceReview,
      contribution: contribution(governanceValue(scenario.input.governanceReview), weights.governance_review_state),
      notes: "Reviewer state remains authoritative for workflow outcome.",
    },
  ];
}

export function runValidationScenario(scenario: ValidationScenario): ScenarioResult {
  const providerSummary = summarizeProviderSignals(scenario.providerSignals);
  const result = calculateTransparentTrustScore({
    ...scenario.input,
    providerSignals: scenario.providerSignals,
    riskFlags: [
      ...(scenario.input.riskFlags ?? []),
      ...providerSummary.riskFlags,
    ],
    providerVerification: providerSummary.providerVerificationState,
  });
  const scoreBefore = Math.max(0, Math.min(100, result.score + (scenario.input.riskFlags?.length ? 12 : 0)));
  const scoreDelta = result.score - scoreBefore;

  return {
    scenario,
    score: result.score,
    level: result.level,
    scoreBefore,
    scoreAfter: result.score,
    scoreDelta,
    scoreContributions: buildContributions(scenario, providerSummary.providerVerificationState),
    triggeredFlags: result.flagsTriggered,
    escalationReasons: [
      scenario.triggerReason,
      result.recommendedAction,
    ],
    workflowOutcome: scenario.workflowOutcome,
    evidenceGenerated: result.evidenceGenerated,
    replayValidation: {
      whatTriggered: scenario.expectedTrigger,
      whyTriggered: scenario.triggerReason,
      evidenceUsed: scenario.evidenceUsed,
      reviewerActions: scenario.reviewerAction,
      trustScoreChange: `${scoreBefore} -> ${result.score} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`,
    },
    providerValidation: scenario.providerValidation,
  };
}

export function runValidationScenarios() {
  return validationScenarios.map(runValidationScenario);
}
