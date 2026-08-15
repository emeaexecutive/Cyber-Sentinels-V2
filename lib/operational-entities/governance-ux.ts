import type { CapabilityGovernanceDecisionSnapshot } from "./capability-governance.ts";
import type { InterAgentConflictDecisionSnapshot } from "./inter-agent-authority-conflict.ts";

export type GovernanceTone = "positive" | "caution" | "negative" | "neutral";

export type OperationalGovernanceSummary = {
  identity: { label: "Verified" | "Unverified" | "Unknown"; tone: GovernanceTone };
  authority: { label: "Active" | "Restricted" | "Review Required" | "Revoked" | "Unknown"; tone: GovernanceTone };
  operationalTrust: { label: "Trusted to act" | "Review required" | "Denied" | "Unknown"; tone: GovernanceTone };
};

const hasReason = (reasons: readonly string[], reason: string) => reasons.includes(reason);
const words = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

export function projectOperationalGovernanceSummary(input: {
  identityStatus?: string | null;
  authorityStatus?: string | null;
  canonicalDecision?: string | null;
  capabilityGovernance?: CapabilityGovernanceDecisionSnapshot | null;
  interAgentConflict?: InterAgentConflictDecisionSnapshot | null;
}): OperationalGovernanceSummary {
  const identity = String(input.identityStatus ?? "").trim().toUpperCase();
  const authority = String(input.authorityStatus ?? "").trim().toUpperCase();
  const decision = String(input.canonicalDecision ?? "").trim().toUpperCase();
  const reviewRequired = ["REVIEW_REQUIRED", "REAUTHORIZATION_REQUIRED"].includes(input.capabilityGovernance?.authorityImpact ?? "")
    || input.interAgentConflict?.decision === "REVIEW";

  return {
    identity: identity === "VERIFIED" || identity === "IDENTITY VERIFIED"
      ? { label: "Verified", tone: "positive" }
      : identity === "UNVERIFIED" || identity === "NOT YET VERIFIED"
        ? { label: "Unverified", tone: "caution" }
        : { label: "Unknown", tone: "neutral" },
    authority: authority === "REVOKED"
      ? { label: "Revoked", tone: "negative" }
      : decision === "DENY" || input.capabilityGovernance?.authorityImpact === "DENY" || input.interAgentConflict?.decision === "DENY"
        ? { label: "Restricted", tone: "negative" }
        : reviewRequired
          ? { label: "Review Required", tone: "caution" }
          : authority === "ACTIVE"
            ? { label: "Active", tone: "positive" }
            : { label: "Unknown", tone: "neutral" },
    operationalTrust: decision === "ALLOW"
      ? { label: "Trusted to act", tone: "positive" }
      : decision === "REVIEW"
        ? { label: "Review required", tone: "caution" }
        : decision === "DENY"
          ? { label: "Denied", tone: "negative" }
          : { label: "Unknown", tone: "neutral" },
  };
}

export function projectCapabilityGovernanceUx(snapshot?: CapabilityGovernanceDecisionSnapshot | null) {
  if (!snapshot) return {
    state: "Unknown",
    tone: "neutral" as GovernanceTone,
    classification: "Not established",
    freshness: "No current evaluation",
    explanation: "Cyber Sentinels does not currently have enough attributed evidence to establish model capability governance.",
    reasonLabels: [] as string[],
  };

  const reasons = snapshot.reasonCodes;
  const state = snapshot.authorityImpact === "REAUTHORIZATION_REQUIRED"
    ? "Reauthorization Required"
    : snapshot.authorityImpact === "DENY" || snapshot.status === "FAIL"
      ? "Denied"
      : snapshot.authorityImpact === "REVIEW_REQUIRED" || ["REVIEW", "UNKNOWN"].includes(snapshot.status)
        ? "Review Required"
        : "Current";
  const changedHash = hasReason(reasons, "MODEL_HASH_CHANGED") || hasReason(reasons, "WEIGHTS_CHANGED");
  const changedEnvironment = hasReason(reasons, "ENVIRONMENT_CHANGED") || hasReason(reasons, "HOSTING_OPERATOR_CHANGED") || hasReason(reasons, "RUNTIME_CHANGED");
  const missingOrExpired = hasReason(reasons, "CAPABILITY_ASSESSMENT_MISSING") || hasReason(reasons, "CAPABILITY_ASSESSMENT_EXPIRED");
  const explanation = changedHash && changedEnvironment
    ? "Reauthorization is required because the deployed model artifact and environment changed after authority was granted."
    : changedHash
      ? "Reauthorization is required because the deployed model hash no longer matches the evaluated artifact."
      : changedEnvironment
        ? "Reauthorization is required because the deployed environment no longer matches the environment under which authority was granted."
        : missingOrExpired
          ? "Review is required because current attributed capability evidence is missing or expired. Provider reputation does not substitute for evidence."
          : hasReason(reasons, "CAPABILITY_EVIDENCE_CONFLICT")
            ? "Review is required because attributed capability evaluators disagree about a material capability claim."
            : snapshot.status === "PASS"
              ? "Current attributed capability evidence matches the deployed model and environment. Open, closed, hosted, and self-hosted labels are descriptive only."
              : "Review is required because the available model-governance evidence does not currently support unchanged authority.";

  return {
    state,
    tone: state === "Current" ? "positive" as GovernanceTone : state === "Denied" ? "negative" as GovernanceTone : "caution" as GovernanceTone,
    classification: `${words(snapshot.model.openClosedClassification)} · descriptive only`,
    freshness: missingOrExpired ? "Missing or expired" : `Evaluated ${snapshot.evaluatedAt}`,
    explanation,
    reasonLabels: reasons.filter((reason) => reason !== "CAPABILITY_GOVERNANCE_PASS").map(words),
  };
}

export function projectInterAgentConflictUx(input: {
  snapshot?: InterAgentConflictDecisionSnapshot | null;
  sourceName?: string | null;
  targetName?: string | null;
}) {
  const snapshot = input.snapshot;
  const source = input.sourceName || snapshot?.sourceAgent || "The first agent";
  const target = input.targetName || snapshot?.targetAgent || "the second agent";
  if (!snapshot) return {
    state: "Unknown",
    tone: "neutral" as GovernanceTone,
    explanation: "Cyber Sentinels does not currently have sufficient evidence to establish whether these authorities are compatible.",
    reasonLabels: [] as string[],
  };

  const state = snapshot.conflictState === "NO_CONFLICT" && snapshot.decision === "ALLOW"
    ? "Compatible"
    : snapshot.conflictState === "UNKNOWN"
      ? "Unknown"
      : snapshot.decision === "DENY"
        ? "Denied"
        : snapshot.conflictState === "INTER_AGENT_CONFLICT"
          ? "Conflict · Review Required"
          : "Potential Conflict · Review Required";
  const explanation = snapshot.conflictState === "UNKNOWN"
    ? "Cyber Sentinels does not currently have sufficient evidence to establish whether these authorities are compatible."
    : snapshot.decision === "DENY"
      ? "The requested action cannot proceed under the current authority and policy."
      : snapshot.conflictState === "NO_CONFLICT"
        ? `${source} and ${target} access the same resource, but their authorized actions are compatible.`
        : snapshot.conflictState === "INTER_AGENT_CONFLICT"
          ? `${source} and ${target} have incompatible objectives affecting the same protected resource.`
          : `${source} and ${target} may affect the same protected resource; additional evidence is required before execution.`;

  return {
    state,
    tone: state === "Compatible" ? "positive" as GovernanceTone : state === "Denied" ? "negative" as GovernanceTone : state === "Unknown" ? "neutral" as GovernanceTone : "caution" as GovernanceTone,
    explanation,
    reasonLabels: snapshot.reasonCodes
      .filter((reason) => !["NO_INTER_AGENT_CONFLICT", "INTER_AGENT_CONFLICT", "POTENTIAL_INTER_AGENT_CONFLICT"].includes(reason))
      .map(words),
  };
}
