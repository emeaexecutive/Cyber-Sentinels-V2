import { hashesEqual } from "@/src/lib/trust-core/hash";
import { PublicApiError } from "./contracts";

export const CLIENT_EVIDENCE_CLASSIFICATION = "AGENT_ASSERTED" as const;
export const CLIENT_EVIDENCE_PROVIDER_CLASS = "APPLICATION_SIGNAL" as const;

const reservedEvidenceTypes = new Set([
  "NATIVE_ENTITY_IDENTITY_PROOF",
  "POLICY_EVIDENCE",
  "POLICY_ACKNOWLEDGEMENT",
  "DEVICE_PROVENANCE",
  "WORKFORCE_CONTINUITY",
  "RUNTIME_AUTHORITY_EVIDENCE",
  "DESTINATION_AUTHORITY_EVIDENCE",
  "INDEPENDENT_CONFIRMATION",
]);

const reservedEvidencePrefixes = [
  "CYBER_SENTINELS_",
  "NATIVE_",
  "SERVER_VERIFIED_",
  "PROVIDER_VERIFIED_",
  "TRACK_BLOCK_",
];

export function resolveClientEvidenceProvider(
  provider: { key: string; class: string },
  clientId: string,
) {
  if (provider.class !== CLIENT_EVIDENCE_PROVIDER_CLASS) {
    throw new PublicApiError(
      "PROVIDER_AUTHENTICATION_REQUIRED",
      "Public API evidence is a client assertion; verified provider classes require an authenticated provider ingestion path.",
      403,
    );
  }
  if (provider.key !== "self" && provider.key !== `api-client:${clientId}`) {
    throw new PublicApiError(
      "PROVIDER_IDENTITY_RESERVED",
      "Public API clients cannot assert another provider identity.",
      403,
    );
  }
  return {
    providerKey: `api-client:${clientId}`,
    providerClass: CLIENT_EVIDENCE_PROVIDER_CLASS,
  };
}

export function resolveClientEvidenceType(value: string) {
  const normalized = value.toUpperCase();
  if (
    reservedEvidenceTypes.has(normalized)
    || reservedEvidencePrefixes.some((prefix) => normalized.startsWith(prefix))
  ) {
    throw new PublicApiError(
      "EVIDENCE_TYPE_RESERVED",
      "This evidence type requires an existing trusted server or provider verification path.",
      403,
    );
  }
  return {
    assertedType: value,
    storedType: `${CLIENT_EVIDENCE_CLASSIFICATION}:${normalized}`,
  };
}

export function verifyClientEvidenceDigest(
  suppliedDigest: string | null,
  computedDigest: string,
) {
  if (suppliedDigest && !hashesEqual(suppliedDigest, computedDigest)) {
    throw new PublicApiError(
      "EVIDENCE_DIGEST_MISMATCH",
      "The supplied evidence digest does not match the server-computed canonical digest.",
      400,
    );
  }
  return computedDigest;
}
