export const providerCapabilityStates = [
  "REGISTERED",
  "CONFIGURED",
  "AVAILABLE",
  "TRANSACTIONAL",
  "SIGNED",
  "SERVER_VERIFIED",
  "DEGRADED",
  "DISABLED",
  "BLOCKED",
] as const;

export type ProviderCapabilityState = (typeof providerCapabilityStates)[number];

export type ProviderCapabilityEvidence = {
  registered: boolean;
  configured: boolean;
  enabled: boolean;
  healthState: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "MISCONFIGURED" | "UNKNOWN";
  transactionReference: string | null;
  transactionSucceeded: boolean;
  signatureVerified: boolean;
  idempotencyVerified: boolean;
  normalizedEvidencePersisted: boolean;
  serverVerifiedEvidence: boolean;
  blockers?: string[];
};

export type ProviderCapabilityTruth = {
  states: ProviderCapabilityState[];
  reasonCodes: string[];
  blockers: string[];
  evidence: {
    transactionReference: string | null;
    signatureVerified: boolean;
    idempotencyVerified: boolean;
    normalizedEvidencePersisted: boolean;
    serverVerifiedEvidence: boolean;
  };
};

export function evaluateProviderCapabilityTruth(input: ProviderCapabilityEvidence): ProviderCapabilityTruth {
  const states: ProviderCapabilityState[] = [];
  const reasonCodes: string[] = [];
  const blockers = [...(input.blockers ?? [])];

  if (input.registered) states.push("REGISTERED");
  if (!input.enabled) {
    states.push("DISABLED");
    reasonCodes.push("PROVIDER_DISABLED");
  }
  if (input.configured) states.push("CONFIGURED");
  if (input.healthState === "DEGRADED" || input.healthState === "UNAVAILABLE") {
    states.push("DEGRADED");
    reasonCodes.push("PROVIDER_HEALTH_DEGRADED");
  }

  const available = input.enabled && input.configured && input.healthState === "HEALTHY";
  if (available) states.push("AVAILABLE");

  const transactional = available && Boolean(input.transactionReference) && input.transactionSucceeded;
  if (transactional) states.push("TRANSACTIONAL");

  const signed = transactional && input.signatureVerified && input.idempotencyVerified;
  if (signed) states.push("SIGNED");

  const serverVerified = signed && input.normalizedEvidencePersisted && input.serverVerifiedEvidence;
  if (serverVerified) states.push("SERVER_VERIFIED");

  if (!input.registered) blockers.push("Provider is not registered.");
  if (input.enabled && !input.configured) blockers.push("Required provider configuration is incomplete.");
  if (input.configured && input.healthState !== "HEALTHY") blockers.push("A successful runtime health check is not present.");
  if (input.transactionSucceeded && !input.transactionReference) blockers.push("A successful transaction lacks a retained provider reference.");
  if (input.signatureVerified && !input.idempotencyVerified) blockers.push("Signature evidence lacks an idempotency result.");
  if (input.serverVerifiedEvidence && (!signed || !input.normalizedEvidencePersisted)) blockers.push("Server verification prerequisites are incomplete.");

  if (blockers.length || !serverVerified) {
    states.push("BLOCKED");
    reasonCodes.push("PROVIDER_CAPABILITY_INCOMPLETE");
  }

  return {
    states: [...new Set(states)],
    reasonCodes: [...new Set(reasonCodes)],
    blockers: [...new Set(blockers)],
    evidence: {
      transactionReference: input.transactionReference,
      signatureVerified: input.signatureVerified,
      idempotencyVerified: input.idempotencyVerified,
      normalizedEvidencePersisted: input.normalizedEvidencePersisted,
      serverVerifiedEvidence: input.serverVerifiedEvidence,
    },
  };
}
