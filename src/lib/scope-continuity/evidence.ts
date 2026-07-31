import type { AttestationSourceType, EnvironmentAttestation, EvidenceStrength } from "./types.ts";

const rank: Record<EvidenceStrength, number> = {
  asserted: 1,
  configured: 2,
  observed: 3,
  independently_attested: 4,
  cryptographically_attested: 5,
};

export function minimumStrengthForSource(source: AttestationSourceType): EvidenceStrength {
  if (source === "provider_assertion" || source === "operator_assertion") return "asserted";
  if (source === "harness_configuration") return "configured";
  if (source === "runtime_observation") return "observed";
  return "independently_attested";
}

export function evidenceStrengthRank(value: EvidenceStrength) {
  return rank[value];
}

export function isIndependentEvidence(attestation: EnvironmentAttestation) {
  return ["runtime_observation", "independent_attestation"].includes(attestation.attestationSourceType)
    && evidenceStrengthRank(attestation.evidenceStrength) >= evidenceStrengthRank("observed");
}

export function validateEvidenceAttribution(attestation: EnvironmentAttestation) {
  const minimum = minimumStrengthForSource(attestation.attestationSourceType);
  if (evidenceStrengthRank(attestation.evidenceStrength) < evidenceStrengthRank(minimum)) {
    throw Object.assign(new TypeError("Evidence strength understates or conflicts with its attributed source."), { code: "EVIDENCE_STRENGTH_INVALID" });
  }
  if (attestation.evidenceStrength === "cryptographically_attested" && attestation.integrityMetadata.signatureVerified !== true) {
    throw Object.assign(new TypeError("Cryptographic attestation requires verified signature evidence."), { code: "CRYPTOGRAPHIC_ATTESTATION_UNVERIFIED" });
  }
  if (attestation.attestationSourceType === "provider_assertion" && !attestation.providerOrThirdPartyIdentity?.trim()) {
    throw Object.assign(new TypeError("Provider assertions must retain provider identity."), { code: "PROVIDER_ATTRIBUTION_REQUIRED" });
  }
  return attestation;
}

export function strongerEvidence(left: EnvironmentAttestation, right: EnvironmentAttestation) {
  return evidenceStrengthRank(left.evidenceStrength) > evidenceStrengthRank(right.evidenceStrength)
    ? left
    : evidenceStrengthRank(right.evidenceStrength) > evidenceStrengthRank(left.evidenceStrength)
      ? right
      : Date.parse(left.observedAt) >= Date.parse(right.observedAt) ? left : right;
}
