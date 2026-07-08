import type { FusionSignalSource } from "@/lib/detection/signal-fusion";

export type CredentialExposureSignal = {
  key: string;
  risk: number;
  explanation: string;
  source_labels: FusionSignalSource[];
};

export type CredentialExposureRiskResult = {
  risk_score: number;
  risk_band: "low" | "medium" | "high" | "critical";
  signals: CredentialExposureSignal[];
  evidence_refs: string[];
  confidence: number;
  limitations: string[];
  source_labels: FusionSignalSource[];
};

const tokenPattern = /(?:api[_-]?key|secret|token|bearer|credential|private[_-]?key|access[_-]?key)/i;

function band(score: number): CredentialExposureRiskResult["risk_band"] {
  if (score >= 0.85) return "critical";
  if (score >= 0.65) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}

export function evaluateCredentialExposureRisk(input: {
  runtimeAction?: string | null;
  accessedResource?: string | null;
  credentialType?: "api_key" | "oauth_token" | "service_account" | "session_token" | "unknown" | null;
  highScopeCredential?: boolean;
  orphanedCredential?: boolean;
  unusualCredentialUsage?: boolean;
  agentAccessToSensitiveSecrets?: boolean;
  outboundActionWithCredentialRisk?: boolean;
  evidence_refs?: string[];
}): CredentialExposureRiskResult {
  const observed = `${input.runtimeAction ?? ""} ${input.accessedResource ?? ""} ${input.credentialType ?? ""}`;
  const signals: CredentialExposureSignal[] = [];
  const add = (key: string, risk: number, explanation: string) => {
    signals.push({
      key,
      risk,
      explanation,
      source_labels: ["Heuristic Baseline", "Runtime Intelligence"],
    });
  };

  if (tokenPattern.test(observed)) {
    add("exposed_token_pattern_placeholder", 0.5, "Runtime context references a credential-like pattern or secret-bearing resource.");
  }
  if (input.highScopeCredential) add("high_scope_credential", 0.65, "Credential scope appears broad or privileged.");
  if (input.orphanedCredential) add("orphaned_credential", 0.7, "Credential lacks a current accountable owner.");
  if (input.unusualCredentialUsage) add("unusual_credential_usage", 0.55, "Credential use differs from the expected workflow pattern.");
  if (input.agentAccessToSensitiveSecrets) add("agent_access_to_sensitive_secrets", 0.75, "Agent touched sensitive secret storage or secret-like resources.");
  if (input.outboundActionWithCredentialRisk) add("outbound_action_with_credential_risk", 0.8, "Outbound action occurred with credential exposure risk present.");

  const risk_score = signals.length
    ? Number(Math.min(1, signals.reduce((total, signal) => total + signal.risk, 0) / signals.length + Math.min(0.15, signals.length * 0.03)).toFixed(3))
    : 0.12;

  return {
    risk_score,
    risk_band: band(risk_score),
    signals,
    evidence_refs: [...(input.evidence_refs ?? [])],
    confidence: signals.length ? Math.min(0.78, 0.42 + signals.length * 0.08) : 0.3,
    limitations: [
      "Heuristic credential exposure risk; not confirmed compromise.",
      "No provider or scanner result is implied unless a source-labelled provider signal is attached.",
      "Raw secrets and provider tokens must not be displayed or persisted in risk summaries.",
    ],
    source_labels: ["Heuristic Baseline", "Runtime Intelligence"],
  };
}
