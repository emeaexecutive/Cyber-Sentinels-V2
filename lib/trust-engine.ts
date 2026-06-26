import type {
  GovernanceReviewState,
  ProviderVerificationState,
} from "@/lib/trust-score";

export type WorkflowTrustDimensions = {
  identityConfidence: number;
  providerVerification: number;
  sessionIntegrity: number;
  behavioralConsistency: number;
  evidenceCompleteness: number;
  authorizationLineage: number;
  governanceReviewState: number;
  replayContinuity: number;
  workflowAnomalies: number;
};

export type WorkflowTrustSignalType =
  | "identity_confidence"
  | "provider_verification"
  | "ip_location_change"
  | "vpn_anomaly"
  | "device_continuity"
  | "browser_consistency"
  | "provider_verification_change"
  | "session_interruption"
  | "workflow_inconsistency"
  | "behavioral_consistency"
  | "evidence_completeness"
  | "authorization_lineage"
  | "governance_review"
  | "replay_continuity";

export type WorkflowTrustSignal = {
  id: string;
  type: WorkflowTrustSignalType;
  observedAt: string;
  value: number;
  direction: "increase" | "decrease" | "neutral";
  explanation: string;
  evidenceReferences: string[];
  provider?: string;
};

export type GovernanceAction = {
  action: "open_review" | "approve" | "reject" | "request_evidence" | "restrict";
  reviewer: string;
  reason: string;
  evidenceReferences: string[];
  occurredAt: string;
};

export type WorkflowTrustState = {
  workflowId: string;
  version: number;
  score: number;
  posture: "trusted" | "reviewable" | "elevated" | "restricted";
  workflowState: "active" | "review_required" | "approved" | "rejected" | "restricted";
  providerVerification: ProviderVerificationState;
  governanceReview: GovernanceReviewState;
  authorizationContinuity: "continuous" | "review_required" | "interrupted";
  dimensions: WorkflowTrustDimensions;
  updatedAt: string;
};

export type WorkflowTrustTransition = {
  id: string;
  workflowId: string;
  occurredAt: string;
  previousScore: number;
  score: number;
  scoreDelta: number;
  previousPosture: WorkflowTrustState["posture"];
  posture: WorkflowTrustState["posture"];
  whatChanged: string[];
  whyChanged: string[];
  evidenceContributed: string[];
  escalationTriggers: string[];
  governanceAction: GovernanceAction | null;
  workflowTransition: string;
  authorizationContinuity: WorkflowTrustState["authorizationContinuity"];
  providerEvidenceUpdates: string[];
  signals: WorkflowTrustSignal[];
};

export type EvolvingWorkflowTrust = {
  state: WorkflowTrustState;
  chronology: WorkflowTrustTransition[];
};

const dimensionWeights: Record<keyof WorkflowTrustDimensions, number> = {
  identityConfidence: 0.16,
  providerVerification: 0.1,
  sessionIntegrity: 0.18,
  behavioralConsistency: 0.1,
  evidenceCompleteness: 0.12,
  authorizationLineage: 0.12,
  governanceReviewState: 0.1,
  replayContinuity: 0.12,
  workflowAnomalies: -0.18,
};

const signalDimensions: Record<WorkflowTrustSignalType, keyof WorkflowTrustDimensions> = {
  identity_confidence: "identityConfidence",
  provider_verification: "providerVerification",
  ip_location_change: "sessionIntegrity",
  vpn_anomaly: "sessionIntegrity",
  device_continuity: "sessionIntegrity",
  browser_consistency: "sessionIntegrity",
  provider_verification_change: "providerVerification",
  session_interruption: "sessionIntegrity",
  workflow_inconsistency: "workflowAnomalies",
  behavioral_consistency: "behavioralConsistency",
  evidence_completeness: "evidenceCompleteness",
  authorization_lineage: "authorizationLineage",
  governance_review: "governanceReviewState",
  replay_continuity: "replayContinuity",
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

function calculateScore(dimensions: WorkflowTrustDimensions) {
  return clamp(
    Object.entries(dimensionWeights).reduce(
      (total, [key, weight]) => total + dimensions[key as keyof WorkflowTrustDimensions] * weight,
      0
    )
  );
}

function postureFor(score: number, workflowState: WorkflowTrustState["workflowState"]) {
  if (workflowState === "rejected" || workflowState === "restricted" || score < 35) return "restricted";
  if (score < 60) return "elevated";
  if (score < 80) return "reviewable";
  return "trusted";
}

export function createWorkflowTrustState(
  workflowId: string,
  dimensions: Partial<WorkflowTrustDimensions> = {},
  updatedAt = new Date().toISOString()
): EvolvingWorkflowTrust {
  const normalized: WorkflowTrustDimensions = {
    identityConfidence: clamp(dimensions.identityConfidence ?? 50),
    providerVerification: clamp(dimensions.providerVerification ?? 50),
    sessionIntegrity: clamp(dimensions.sessionIntegrity ?? 50),
    behavioralConsistency: clamp(dimensions.behavioralConsistency ?? 50),
    evidenceCompleteness: clamp(dimensions.evidenceCompleteness ?? 50),
    authorizationLineage: clamp(dimensions.authorizationLineage ?? 50),
    governanceReviewState: clamp(dimensions.governanceReviewState ?? 45),
    replayContinuity: clamp(dimensions.replayContinuity ?? 50),
    workflowAnomalies: clamp(dimensions.workflowAnomalies ?? 0),
  };
  const score = calculateScore(normalized);

  return {
    state: {
      workflowId,
      version: 1,
      score,
      posture: postureFor(score, "active"),
      workflowState: "active",
      providerVerification: "none",
      governanceReview: "not_started",
      authorizationContinuity: "continuous",
      dimensions: normalized,
      updatedAt,
    },
    chronology: [],
  };
}

export function evolveWorkflowTrust(
  current: EvolvingWorkflowTrust,
  input: {
    signals?: WorkflowTrustSignal[];
    governanceAction?: GovernanceAction;
    providerVerification?: ProviderVerificationState;
  }
): EvolvingWorkflowTrust {
  const signals = input.signals ?? [];
  const dimensions = { ...current.state.dimensions };
  const whatChanged: string[] = [];
  const whyChanged: string[] = [];
  const evidence = new Set<string>();
  const providerUpdates: string[] = [];
  const escalationTriggers: string[] = [];

  for (const signal of signals) {
    const dimension = signalDimensions[signal.type];
    const previous = dimensions[dimension];
    const next =
      dimension === "workflowAnomalies"
        ? clamp(signal.value)
        : clamp(signal.direction === "neutral" ? signal.value : previous + signal.value);
    dimensions[dimension] = next;
    whatChanged.push(`${dimension}: ${previous} to ${next}`);
    whyChanged.push(signal.explanation);
    signal.evidenceReferences.forEach((reference) => evidence.add(reference));
    if (signal.provider || signal.type.includes("provider")) {
      providerUpdates.push(`${signal.provider ?? "Provider"}: ${signal.explanation}`);
    }
    if (
      signal.direction === "decrease" ||
      (dimension === "workflowAnomalies" && next >= 35) ||
      ["vpn_anomaly", "session_interruption", "workflow_inconsistency"].includes(signal.type)
    ) {
      escalationTriggers.push(signal.explanation);
    }
  }

  let workflowState = current.state.workflowState;
  let governanceReview = current.state.governanceReview;
  let authorizationContinuity = current.state.authorizationContinuity;
  const action = input.governanceAction ?? null;

  if (action) {
    action.evidenceReferences.forEach((reference) => evidence.add(reference));
    whyChanged.push(`${action.reviewer}: ${action.reason}`);
    if (action.action === "open_review" || action.action === "request_evidence") {
      workflowState = "review_required";
      governanceReview = action.action === "open_review" ? "escalated" : "pending";
      authorizationContinuity = "review_required";
    } else if (action.action === "approve") {
      workflowState = "approved";
      governanceReview = "approved";
      authorizationContinuity = "continuous";
      dimensions.governanceReviewState = 90;
    } else if (action.action === "reject") {
      workflowState = "rejected";
      governanceReview = "rejected";
      authorizationContinuity = "interrupted";
      dimensions.governanceReviewState = 15;
    } else {
      workflowState = "restricted";
      governanceReview = "escalated";
      authorizationContinuity = "interrupted";
      dimensions.governanceReviewState = 30;
    }
  } else if (escalationTriggers.length) {
    workflowState = "review_required";
    governanceReview = "pending";
    authorizationContinuity = "review_required";
  }

  const score = calculateScore(dimensions);
  const occurredAt =
    action?.occurredAt ?? signals.at(-1)?.observedAt ?? new Date().toISOString();
  const state: WorkflowTrustState = {
    ...current.state,
    version: current.state.version + 1,
    score,
    posture: postureFor(score, workflowState),
    workflowState,
    providerVerification: input.providerVerification ?? current.state.providerVerification,
    governanceReview,
    authorizationContinuity,
    dimensions,
    updatedAt: occurredAt,
  };
  const transition: WorkflowTrustTransition = {
    id: `${current.state.workflowId}-transition-${state.version}`,
    workflowId: current.state.workflowId,
    occurredAt,
    previousScore: current.state.score,
    score,
    scoreDelta: score - current.state.score,
    previousPosture: current.state.posture,
    posture: state.posture,
    whatChanged,
    whyChanged,
    evidenceContributed: [...evidence],
    escalationTriggers,
    governanceAction: action,
    workflowTransition: `${current.state.workflowState} to ${workflowState}`,
    authorizationContinuity,
    providerEvidenceUpdates: providerUpdates,
    signals,
  };

  return { state, chronology: [...current.chronology, transition] };
}
