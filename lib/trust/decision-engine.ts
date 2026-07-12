import type { DetectionSource } from "../detection/detection-engine.ts";

export type TrustDecision = "allow" | "step_up" | "review" | "escalate" | "block" | "insufficient_evidence" | "insufficient evidence";

export type TrustDecisionInput = {
  identityConfidence?: number | null;
  agentOwnership?: "known" | "unknown" | "orphaned" | null;
  humanAuthority?: "active" | "expired" | "missing" | null;
  intentRisk?: number | null;
  permissionScope?: "matched" | "overbroad" | "mismatch" | "unknown" | null;
  sessionIntegrity?: number | null;
  provenanceConfidence?: number | null;
  proofOfHuman?: "verified" | "failed" | "unknown" | null;
  providerSignals?: number | null;
  heuristicBaseline?: number | null;
  runtimeAnomalies?: number | null;
  governanceHistory?: Array<"approved" | "review" | "escalated" | "blocked">;
  sourceLabels?: DetectionSource[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function toRisk(confidence: number | null | undefined) {
  return typeof confidence === "number" && Number.isFinite(confidence) ? 1 - clamp01(confidence) : null;
}

export function evaluateTrustDecision(input: TrustDecisionInput) {
  const risks = [
    toRisk(input.identityConfidence),
    input.agentOwnership === "orphaned" ? 0.75 : input.agentOwnership === "unknown" ? 0.55 : input.agentOwnership === "known" ? 0.1 : null,
    input.humanAuthority === "missing" ? 0.8 : input.humanAuthority === "expired" ? 0.65 : input.humanAuthority === "active" ? 0.1 : null,
    typeof input.intentRisk === "number" ? clamp01(input.intentRisk / 100) : null,
    input.permissionScope === "mismatch" ? 0.8 : input.permissionScope === "overbroad" ? 0.55 : input.permissionScope === "matched" ? 0.1 : null,
    toRisk(input.sessionIntegrity),
    toRisk(input.provenanceConfidence),
    input.proofOfHuman === "failed" ? 0.75 : input.proofOfHuman === "unknown" ? 0.45 : input.proofOfHuman === "verified" ? 0.05 : null,
    toRisk(input.providerSignals),
    toRisk(input.heuristicBaseline),
    typeof input.runtimeAnomalies === "number" ? clamp01(input.runtimeAnomalies) : null,
  ].filter((value): value is number => value !== null);
  const priorBlocked = (input.governanceHistory ?? []).includes("blocked");
  const priorEscalated = (input.governanceHistory ?? []).includes("escalated");
  const risk = risks.length ? risks.reduce((total, value) => total + value, 0) / risks.length : null;

  let decision: TrustDecision = "insufficient_evidence";
  if (risk !== null) {
    decision =
      priorBlocked || risk >= 0.8
        ? "block"
        : priorEscalated || risk >= 0.6
          ? "escalate"
          : risk >= 0.45
            ? "step_up"
            : risk >= 0.3
            ? "review"
            : "allow";
  }

  const sourceLabels = input.sourceLabels?.length
    ? input.sourceLabels
    : (["Heuristic Baseline", "Runtime Intelligence"] as DetectionSource[]);
  const reason =
    decision === "insufficient_evidence"
      ? "No sufficient evidence was supplied for a decision."
      : decision === "block"
        ? "Critical risk or prior blocking evidence requires the action to stop while evidence is preserved."
        : decision === "escalate"
          ? "Risk crossed governance escalation threshold."
          : decision === "step_up"
            ? "Evidence requires stronger verification before execution continues."
          : decision === "review"
            ? "Evidence supports human review before execution continues."
            : "Available evidence supports allow under current policy.";

  return {
    decision,
    reason,
    confidence: risk === null ? 0 : Number((1 - Math.min(0.95, Math.abs(0.5 - risk))).toFixed(2)),
    evidence: [
      `Identity confidence: ${input.identityConfidence ?? "not supplied"}`,
      `Agent ownership: ${input.agentOwnership ?? "not supplied"}`,
      `Human authority: ${input.humanAuthority ?? "not supplied"}`,
      `Proof of human: ${input.proofOfHuman ?? "not supplied"}`,
      `Permission scope: ${input.permissionScope ?? "not supplied"}`,
      `Intent risk: ${input.intentRisk ?? "not supplied"}`,
      `Runtime anomalies: ${input.runtimeAnomalies ?? "not supplied"}`,
    ],
    source_labels: sourceLabels,
    limitations: [
      "Decision output is policy and evidence orchestration, not autonomous truth.",
      "Provider and heuristic signals are review evidence, not final authenticity verdicts.",
      "Manual reviewer action remains authoritative for escalated and blocked states.",
    ],
  };
}
