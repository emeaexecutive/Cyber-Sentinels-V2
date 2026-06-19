export type HopaeAssuranceInput = {
  completed: boolean;
  loa?: number | null;
  providerId?: string | null;
  provenance?: unknown;
};

function hasProvenanceCredentials(provenance: unknown) {
  if (!provenance || typeof provenance !== "object") return false;
  const value = provenance as Record<string, unknown>;
  const credentials = value.credentials ?? value.credential ?? value.verifiableCredentials;
  return Array.isArray(credentials) ? credentials.length > 0 : Boolean(credentials);
}

export function calculateHopaeIdentityAssurance(input: HopaeAssuranceInput) {
  if (!input.completed) {
    return { uplift: 0, provenanceConfidence: false, decision: "manual_review" as const };
  }

  const loa = Number.isFinite(input.loa) ? Number(input.loa) : 1;
  let uplift = loa >= 4 ? 30 : loa === 3 ? 22 : loa === 2 ? 12 : 5;
  const provenanceCredentialsPresent = hasProvenanceCredentials(input.provenance);
  if (!provenanceCredentialsPresent) uplift = Math.min(uplift, 10);

  return {
    uplift,
    provenanceConfidence: Boolean(input.providerId && provenanceCredentialsPresent),
    decision: "manual_review" as const,
  };
}
