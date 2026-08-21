import { normalizeProviderSignal, toNormalizedVerificationResponse } from "./signals.ts";
import type {
  NormalizedVerificationResponse,
  ProviderSignalInput,
  VerificationProviderId,
  VerificationProviderSignal,
} from "./types.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type VerificationProviderAdapter = {
  id: VerificationProviderId;
  normalize: (input: Omit<ProviderSignalInput, "providerId">) => VerificationProviderSignal;
  normalizeResponse: (input: Omit<ProviderSignalInput, "providerId">) => NormalizedVerificationResponse;
};

export const PROVIDER_CLASSES = [
  "IDENTITY_PROVIDER",
  "RUNTIME_SECURITY_PROVIDER",
  "AI_ASSURANCE_PROVIDER",
  "AI_ASSISTANCE_PROVIDER",
  "APPLICATION_SIGNAL",
  "EDR_PROVIDER",
  "DSPM_PROVIDER",
  "NETWORK_SECURITY_PROVIDER",
  "ROBOTICS_RUNTIME_PROVIDER",
  "ROBOTICS_SAFETY_PROVIDER",
  "SENSOR_EVIDENCE_PROVIDER",
  "MODEL_EVALUATION_PROVIDER",
  "EDGE_ATTESTATION_PROVIDER",
  "OUTCOME_PROVIDER",
] as const;

export type ProviderClass = (typeof PROVIDER_CLASSES)[number];

export type ProviderAdapterInput = {
  providerKey: string;
  eventId: string;
  subject: { type: string; id: string };
  evidenceType: string;
  finding: string;
  evidence: Record<string, unknown>;
  occurredAt: string;
  expiresAt?: string | null;
  digest?: string | null;
};

export type ProviderAdapterVerification = {
  verified: boolean;
  reasonCodes: string[];
};

export type CanonicalProviderEvidence = {
  evidenceId: string;
  providerKey: string;
  providerClass: ProviderClass;
  subject: { type: string; id: string };
  evidenceType: string;
  result: "POSITIVE" | "NEGATIVE" | "INCONCLUSIVE" | "REVOKED" | "UNAVAILABLE";
  normalizedFacts: Record<string, unknown>;
  occurredAt: string;
  receivedAt: string;
  expiresAt: string | null;
  payloadHash: string;
  cryptographicallyVerified: boolean;
  serverVerified: boolean;
  reasonCodes: string[];
};

export interface ProviderAdapter {
  readonly providerKey: string;
  readonly providerClass: ProviderClass;
  validate(input: ProviderAdapterInput): string[];
  verify(input: ProviderAdapterInput): Promise<ProviderAdapterVerification>;
  normalize(input: ProviderAdapterInput): Record<string, unknown>;
  mapEvidence(input: ProviderAdapterInput, receivedAt?: string): Promise<CanonicalProviderEvidence>;
}

export type ProviderNeutralEvidence = {
  providerId: string;
  providerName: string;
  evidenceType: string;
  observedAt: string;
  outcome: string;
  evidenceDigest: string;
  correlationId: string | null;
  monitoringCoverage: "covered" | "partial" | "not_observed";
  identityContinuity: "continuous" | "review_required" | "interrupted";
  signingBoundary: "provider_signed" | "human_signed" | "unsigned";
  providerClass?: string | null;
  providerKey?: string | null;
  environment?: string | null;
  scope?: string | null;
  modelVersion?: string | null;
  permissionContext?: string | null;
  assurance?: number | null;
  confidence?: string | null;
  findingReferences?: string[] | null;
  retestReference?: string | null;
};

export function normalizeProviderNeutralEvidence(input: {
  providerId: string;
  providerName?: string | null;
  evidenceType: string;
  observedAt: string;
  outcome: string;
  evidenceDigest: string;
  correlationId?: string | null;
  providerClass?: string | null;
  providerKey?: string | null;
  environment?: string | null;
  scope?: string | null;
  modelVersion?: string | null;
  permissionContext?: string | null;
  assurance?: number | null;
  confidence?: string | null;
  findingReferences?: string[] | null;
  retestReference?: string | null;
}): ProviderNeutralEvidence {
  const providerId = input.providerId || "external_unattributed";
  const monitoringCoverage = /runtime|monitor/i.test(input.evidenceType) || providerId === "runtime_security" ? "covered" : "partial";
  const identityContinuity = /passed|succeeded|verified/i.test(input.outcome) ? "continuous" : "review_required";
  const signingBoundary = providerId === "runtime_security" ? "provider_signed" : providerId === "human_intent" ? "human_signed" : "unsigned";
  return {
    providerId,
    providerName: input.providerName ?? providerId.replace(/_/g, " "),
    evidenceType: input.evidenceType,
    observedAt: input.observedAt,
    outcome: input.outcome,
    evidenceDigest: input.evidenceDigest,
    correlationId: input.correlationId ?? null,
    monitoringCoverage,
    identityContinuity,
    signingBoundary,
    providerClass: input.providerClass ?? null,
    providerKey: input.providerKey ?? null,
    environment: input.environment ?? null,
    scope: input.scope ?? null,
    modelVersion: input.modelVersion ?? null,
    permissionContext: input.permissionContext ?? null,
    assurance: input.assurance ?? null,
    confidence: input.confidence ?? null,
    findingReferences: Array.isArray(input.findingReferences) ? input.findingReferences.filter((item): item is string => typeof item === "string") : [],
    retestReference: input.retestReference ?? null,
  };
}

function adapter(id: VerificationProviderId): VerificationProviderAdapter {
  return {
    id,
    normalize: (input) => normalizeProviderSignal({ ...input, providerId: id }),
    normalizeResponse: (input) =>
      toNormalizedVerificationResponse(normalizeProviderSignal({ ...input, providerId: id })),
  };
}

export const providerAdapters: Record<VerificationProviderId, VerificationProviderAdapter> = {
  external_unattributed: adapter("external_unattributed"),
  world_id: adapter("world_id"),
  stripe_identity: adapter("stripe_identity"),
  persona: adapter("persona"),
  entrust: adapter("entrust"),
  onfido: adapter("onfido"),
  hopae_connect: adapter("hopae_connect"),
  cloudflare_turnstile: adapter("cloudflare_turnstile"),
  fingerprint_device_risk: adapter("fingerprint_device_risk"),
};

export function getProviderAdapter(id: VerificationProviderId) {
  return providerAdapters[id];
}

export function createReferenceProviderAdapter(providerKey: string, providerClass: ProviderClass): ProviderAdapter {
  return {
    providerKey,
    providerClass,
    validate(input) {
      const errors: string[] = [];
      if (input.providerKey !== providerKey) errors.push("PROVIDER_KEY_MISMATCH");
      if (!input.eventId?.trim()) errors.push("PROVIDER_EVENT_ID_REQUIRED");
      if (!input.subject?.id?.trim() || !input.subject?.type?.trim()) errors.push("SUBJECT_REQUIRED");
      if (!input.evidenceType?.trim()) errors.push("EVIDENCE_TYPE_REQUIRED");
      if (!input.finding?.trim()) errors.push("PROVIDER_FINDING_REQUIRED");
      if (!Number.isFinite(Date.parse(input.occurredAt))) errors.push("OCCURRED_AT_INVALID");
      if (input.expiresAt && !Number.isFinite(Date.parse(input.expiresAt))) errors.push("EXPIRES_AT_INVALID");
      return errors;
    },
    async verify(input) {
      const validation = this.validate(input);
      return validation.length
        ? { verified: false, reasonCodes: validation }
        : { verified: false, reasonCodes: ["REFERENCE_ADAPTER_NON_LIVE", "PROVIDER_ATTESTATION_NOT_CONFIGURED"] };
    },
    normalize(input) {
      return {
        providerClass,
        providerKey,
        providerEventId: input.eventId,
        subject: input.subject,
        evidenceType: input.evidenceType,
        providerFinding: input.finding,
        evidence: input.evidence,
      };
    },
    async mapEvidence(input, receivedAt = new Date().toISOString()) {
      const verification = await this.verify(input);
      const normalizedFacts = this.normalize(input);
      return {
        evidenceId: crypto.randomUUID(),
        providerKey,
        providerClass,
        subject: input.subject,
        evidenceType: input.evidenceType,
        result: "INCONCLUSIVE",
        normalizedFacts,
        occurredAt: new Date(input.occurredAt).toISOString(),
        receivedAt: new Date(receivedAt).toISOString(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
        payloadHash: input.digest ?? hashCanonical(normalizedFacts),
        cryptographicallyVerified: verification.verified,
        serverVerified: false,
        reasonCodes: [...verification.reasonCodes, "PROVIDER_FINDING_IS_NOT_A_CYBER_SENTINELS_DECISION"],
      };
    },
  };
}

export const referenceProviderAdapters = {
  "neuraltrust-compatible-test-provider": createReferenceProviderAdapter("neuraltrust-compatible-test-provider", "RUNTIME_SECURITY_PROVIDER"),
  "mythos-compatible-test-provider": createReferenceProviderAdapter("mythos-compatible-test-provider", "AI_ASSURANCE_PROVIDER"),
  "identity-compatible-test-provider": createReferenceProviderAdapter("identity-compatible-test-provider", "IDENTITY_PROVIDER"),
  "cyera-compatible-test-provider": createReferenceProviderAdapter("cyera-compatible-test-provider", "DSPM_PROVIDER"),
  "robotics-sensor-test-provider": createReferenceProviderAdapter("robotics-sensor-test-provider", "SENSOR_EVIDENCE_PROVIDER"),
  "destination-outcome-test-provider": createReferenceProviderAdapter("destination-outcome-test-provider", "OUTCOME_PROVIDER"),
} as const satisfies Record<string, ProviderAdapter>;

export function getReferenceProviderAdapter(providerKey: string) {
  return referenceProviderAdapters[providerKey as keyof typeof referenceProviderAdapters] ?? null;
}
