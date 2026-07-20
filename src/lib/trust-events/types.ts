export const TRUST_EVENT_SCHEMA_VERSION = "trust-event-v1" as const;
export const TRUST_EVENT_CANONICALIZATION = "RFC8785-JCS" as const;
export const TRUST_EVENT_HASH_ALGORITHM = "SHA-256" as const;

export const trustEventSubjectTypes = ["HUMAN", "AI_AGENT", "SERVICE", "DEVICE", "WORKLOAD", "ORGANIZATION", "UNKNOWN"] as const;
export const trustEventActorTypes = ["USER", "AI_AGENT", "SERVICE", "SYSTEM", "ADMINISTRATOR", "PROVIDER", "UNKNOWN"] as const;
export const trustEventDispositions = ["ACCEPTED", "DUPLICATE", "REJECTED_SIGNATURE", "REJECTED_TIMESTAMP", "REJECTED_REPLAY", "REJECTED_SCHEMA", "REJECTED_TENANT", "BLOCKED_PROVIDER", "INCONCLUSIVE", "FAILED"] as const;
export const providerProtocols = ["HMAC", "SIGNED_JWT", "PUBLIC_KEY_SIGNATURE", "CHALLENGE_RESPONSE", "OAUTH_PROTECTED", "MTLS", "UNSIGNED", "UNSUPPORTED"] as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type TrustEventSubjectType = (typeof trustEventSubjectTypes)[number];
export type TrustEventActorType = (typeof trustEventActorTypes)[number];
export type TrustEventDisposition = (typeof trustEventDispositions)[number];
export type ProviderProtocol = (typeof providerProtocols)[number];

export type TrustReference<T extends string> = { type: T; id: string };
export type OptionalTrustReference<T extends string> = TrustReference<T> | null;

export interface CanonicalTrustEvent {
  eventId: string;
  enterpriseId: string;
  schemaVersion: typeof TRUST_EVENT_SCHEMA_VERSION;
  eventType: string;
  subject: TrustReference<TrustEventSubjectType>;
  actor: TrustReference<TrustEventActorType>;
  workflow: OptionalTrustReference<"WORKFLOW">;
  session: OptionalTrustReference<"SESSION">;
  authority: OptionalTrustReference<"AUTHORITY">;
  provider: {
    key: string;
    protocol: ProviderProtocol;
    serverVerified: boolean;
    eventId: string | null;
    transactionId: string | null;
    deliveryId: string | null;
  };
  normalizedFacts: Record<string, JsonValue>;
  reasonCodes: string[];
  evidenceReferences: string[];
  occurredAt: string;
  receivedAt: string;
  sequence: number;
  previousHash: string | null;
  eventHash: string;
  canonicalization: typeof TRUST_EVENT_CANONICALIZATION;
  hashAlgorithm: typeof TRUST_EVENT_HASH_ALGORITHM;
  ordering: { late: boolean; supersedesEventId: string | null; providerSequence: number | null };
}

export type UnsignedTrustEvent = Omit<CanonicalTrustEvent, "eventHash"> & { eventHash?: string };

export interface RawProviderRequest {
  rawBytes: Uint8Array;
  headers: Readonly<Record<string, string>>;
  method: string;
  path: string;
  receivedAt: Date;
  correlationId: string;
  authenticatedEnterpriseId?: string;
  authenticatedActorId?: string;
}

export interface ProviderCapabilities {
  protocol: ProviderProtocol;
  implementationStatus: "IMPLEMENTED" | "PARTIALLY_IMPLEMENTED" | "UNSUPPORTED" | "DISABLED";
  runtimeStatus: "AVAILABLE" | "BLOCKED_BY_CREDENTIALS" | "BLOCKED_BY_EXTERNAL_CONFIGURATION" | "DISABLED" | "UNSUPPORTED";
  signatureVerification: boolean;
  serverVerification: boolean;
  positiveEvidence: boolean;
  reasonCodes: string[];
}

export interface EnvelopeVerificationResult {
  verified: boolean;
  serverVerified: boolean;
  signatureTimestamp: string | null;
  nonce: string | null;
  reasonCodes: string[];
  disposition?: TrustEventDisposition;
}

export interface ProviderEnvelope {
  providerKey: string;
  payload: Record<string, unknown>;
  providerEventId: string | null;
  transactionId: string | null;
  deliveryId: string | null;
  nonce: string | null;
  occurredAt: string | null;
  providerSequence: number | null;
  subjectId: string | null;
  workflowId: string | null;
  sessionId: string | null;
  authorityId: string | null;
  authenticatedActorId?: string;
}

export interface NormalizedProviderEvent {
  eventType: string;
  subject: TrustReference<TrustEventSubjectType>;
  actor: TrustReference<TrustEventActorType>;
  workflowId: string | null;
  sessionId: string | null;
  authorityId: string | null;
  normalizedFacts: Record<string, JsonValue>;
  reasonCodes: string[];
  evidenceReferences: string[];
  occurredAt: string;
  providerSequence: number | null;
  supersedesEventId: string | null;
}

export interface EvidenceProviderAdapter {
  key: string;
  getCapabilities(): Promise<ProviderCapabilities>;
  verifyEnvelope(input: RawProviderRequest): Promise<EnvelopeVerificationResult>;
  parseEnvelope(input: RawProviderRequest): Promise<ProviderEnvelope>;
  deriveIdempotencyKey(envelope: ProviderEnvelope): Promise<string>;
  normalize(envelope: ProviderEnvelope): Promise<NormalizedProviderEvent[]>;
}

export interface GatewayResult {
  ok: boolean;
  disposition: TrustEventDisposition;
  correlationId: string;
  envelopeId?: string;
  eventIds: string[];
  reasonCodes: string[];
  conflict?: boolean;
}
