export type TrustAssuranceLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type TrustAssuranceInput = {
  basicEvidence: boolean;
  sessionContinuity: boolean;
  consentRecorded: boolean;
  providerBackedIdentity: boolean;
  governanceApproved: boolean;
  replayIntegrity: boolean;
  authorizationContinuity: boolean;
  secureDeviceAttestation: boolean;
  evidenceQuality: number;
  evidenceReferences?: string[];
};

export type TrustAssuranceResult = {
  level: TrustAssuranceLevel;
  label: string;
  explanation: string;
  satisfiedRequirements: string[];
  unmetRequirements: string[];
  evidenceReferences: string[];
  contextualNotCertain: true;
};

const labels: Record<TrustAssuranceLevel, string> = {
  L0: "Not established",
  L1: "Basic verification",
  L2: "Session verification",
  L3: "Provider-backed identity",
  L4: "Governance-approved workflow",
  L5: "High-assurance operational trust",
};

function boundedQuality(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evaluateTrustAssurance(input: TrustAssuranceInput): TrustAssuranceResult {
  const evidenceQuality = boundedQuality(input.evidenceQuality);
  const checks = [
    ["Basic evidence is present", input.basicEvidence],
    ["Session continuity is recorded", input.sessionContinuity],
    ["Consent is recorded", input.consentRecorded],
    ["Provider-backed identity evidence is present", input.providerBackedIdentity],
    ["Human governance approved the workflow", input.governanceApproved],
    ["Replay integrity is available", input.replayIntegrity],
    ["Authorization continuity is intact", input.authorizationContinuity],
    ["Secure device or hardware attestation is present", input.secureDeviceAttestation],
    ["Evidence quality meets the high-assurance threshold", evidenceQuality >= 80],
  ] as const;

  let level: TrustAssuranceLevel = input.basicEvidence ? "L1" : "L0";
  if (level === "L1" && input.sessionContinuity) level = "L2";
  if (
    level === "L2" &&
    input.consentRecorded &&
    input.providerBackedIdentity
  ) level = "L3";
  if (
    level === "L3" &&
    input.governanceApproved &&
    input.replayIntegrity
  ) level = "L4";
  if (
    level === "L4" &&
    input.authorizationContinuity &&
    input.secureDeviceAttestation &&
    evidenceQuality >= 80
  ) level = "L5";

  return {
    level,
    label: labels[level],
    explanation:
      `${labels[level]} reflects the evidence and governance currently attached to this workflow. ` +
      "It is contextual, reviewable and does not establish biometric certainty.",
    satisfiedRequirements: checks.filter(([, met]) => met).map(([label]) => label),
    unmetRequirements: checks.filter(([, met]) => !met).map(([label]) => label),
    evidenceReferences: [...new Set(input.evidenceReferences ?? [])].slice(0, 50),
    contextualNotCertain: true,
  };
}
