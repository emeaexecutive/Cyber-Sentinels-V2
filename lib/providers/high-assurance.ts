export type HighAssuranceCapability =
  | "iris_verification_reference"
  | "liveness_reference"
  | "hardware_backed_identity"
  | "secure_device_attestation"
  | "enterprise_identity_hardware";

export type HighAssuranceProviderContract = {
  providerId: string;
  capabilities: HighAssuranceCapability[];
  consentRequired: true;
  dataHandling: "reference_only";
  acceptsRawBiometricOutput: false;
  requiresHumanGovernance: true;
};

export type HighAssuranceEvidenceReference = {
  providerId: string;
  capability: HighAssuranceCapability;
  verificationState: "verified" | "pending" | "failed" | "not_available";
  evidenceReference: string;
  observedAt: string;
  consentReference: string;
  summary: string;
};

export function defineHighAssuranceProvider(
  providerId: string,
  capabilities: HighAssuranceCapability[]
): HighAssuranceProviderContract {
  return {
    providerId: providerId.trim().slice(0, 100),
    capabilities: [...new Set(capabilities)],
    consentRequired: true,
    dataHandling: "reference_only",
    acceptsRawBiometricOutput: false,
    requiresHumanGovernance: true,
  };
}

export function validateHighAssuranceEvidence(
  contract: HighAssuranceProviderContract,
  evidence: HighAssuranceEvidenceReference
) {
  const errors: string[] = [];
  if (evidence.providerId !== contract.providerId) errors.push("Provider does not match contract.");
  if (!contract.capabilities.includes(evidence.capability)) errors.push("Capability is not declared.");
  if (!evidence.consentReference.trim()) errors.push("Consent reference is required.");
  if (!evidence.evidenceReference.trim()) errors.push("Evidence reference is required.");
  if (Number.isNaN(new Date(evidence.observedAt).getTime())) errors.push("Observed timestamp is invalid.");

  return {
    valid: errors.length === 0,
    errors,
    replaySafe: errors.length === 0 && contract.dataHandling === "reference_only",
  };
}

