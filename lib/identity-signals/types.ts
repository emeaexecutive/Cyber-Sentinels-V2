export const identitySignalTypes = [
  "IDENTITY_ASSERTION",
  "GOVERNMENT_ID",
  "PROOF_OF_PERSONHOOD",
  "EMAIL_OWNERSHIP",
  "PHONE_OWNERSHIP",
  "IP_REPUTATION",
  "NETWORK_ANONYMITY",
  "GEOLOCATION",
  "DEVICE_CONTEXT",
] as const;

export const identitySignalStatuses = [
  "PASS",
  "FAIL",
  "INCONCLUSIVE",
  "UNAVAILABLE",
  "UNSUPPORTED",
  "BLOCKED",
  "ERROR",
  "PENDING",
] as const;

export const identityReasonCodes = [
  "CLIENT_REPORTED_DEVICE_CONTEXT",
  "CONTRADICTION_DETECTED",
  "DEVICE_CONTEXT_EMPTY",
  "DEVICE_CONTEXT_NOT_PROVIDED",
  "DEVICE_HASH_SECRET_NOT_CONFIGURED",
  "HOPAE_CREDENTIALS_OR_CONFIGURATION_MISSING",
  "HOPAE_DISABLED",
  "HOPAE_EVIDENCE_QUALITY_NOT_ACCEPTED",
  "HOPAE_SESSION_START_FAILED",
  "HOPAE_SIGNED_CALLBACK_EVIDENCE_ACCEPTED",
  "HOPAE_WORKFLOW_CONTEXT_REQUIRED",
  "IDEMPOTENT_REPLAY_RETURNED",
  "MULTI_SIGNAL_SERVER_VERIFIED",
  "NO_SERVER_VERIFIED_EVIDENCE",
  "PROVIDER_ERROR",
  "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_VERIFICATION_PENDING",
  "SIGNAL_UNSUPPORTED",
  "SINGLE_SERVER_VERIFIED_SIGNAL",
  "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED",
] as const;

export type IdentitySignalType = (typeof identitySignalTypes)[number];
export type IdentitySignalStatus = (typeof identitySignalStatuses)[number];
export type IdentityReasonCode = (typeof identityReasonCodes)[number];
export type SignalOutcome = "VERIFIED" | "FAILED" | "INCONCLUSIVE" | "UNAVAILABLE" | "BLOCKED" | "UNSUPPORTED";
export type TransactionStatus = "SUCCEEDED" | "INCONCLUSIVE" | "BLOCKED" | "UNAVAILABLE" | "FAILED";
export type IdentitySubjectType = "human" | "agent" | "candidate" | "customer" | "employee" | "contractor" | "other";

export type IdentitySubject = {
  id: string;
  enterpriseId: string;
  subjectType: IdentitySubjectType;
  externalReferenceHash: string | null;
  displayLabel: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type IdentityVerificationRequest = {
  id: string;
  enterpriseId: string;
  subjectId: string;
  operation: "identity_verification";
  requestedSignals: IdentitySignalType[];
  purpose: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  requestedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IdentityProviderCapability = {
  id?: string;
  enterpriseId?: string | null;
  providerId: string;
  signalType: IdentitySignalType;
  providerName: string;
  implementationStatus: "IMPLEMENTED" | "PARTIALLY_IMPLEMENTED" | "DOCUMENTED_ONLY" | "MISSING";
  runtimeStatus: "AVAILABLE" | "BLOCKED_BY_CREDENTIALS" | "BLOCKED_BY_EXTERNAL_CONFIGURATION" | "DISABLED" | "UNSUPPORTED";
  serverVerified: boolean;
  limitations: string[];
};

export type IdentityProviderHealth = {
  providerId: string;
  available: boolean;
  state: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "MISCONFIGURED" | "DISABLED" | "UNKNOWN";
  reasonCode: IdentityReasonCode | null;
  checkedAt: string;
};

export type SignalProvenance = {
  source: "provider_api" | "signed_callback" | "client_context" | "registry" | "none";
  mappingVersion: string;
  collectedAt: string;
};

export type SignalEvidenceDraft = {
  signalType: IdentitySignalType;
  providerId: string;
  status: IdentitySignalStatus;
  outcome: SignalOutcome;
  confidence: number;
  riskScore: number | null;
  riskFlags: string[];
  serverVerified: boolean;
  signatureVerified: boolean;
  providerEventId: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  providerRequestId: string | null;
  payloadHash: string | null;
  normalizedValue: Record<string, string | number | boolean | null> | null;
  provenance: SignalProvenance;
  sourceDigest?: string | null;
  reasonCodes: IdentityReasonCode[];
  limitations: string[];
  attributes?: Record<string, string | number | boolean | null>;
  observedAt: string;
  expiresAt?: string | null;
};

export type IdentityProviderTransaction = {
  id: string;
  enterpriseId: string;
  verificationRequestId: string;
  providerId: string;
  signalType: IdentitySignalType;
  status: TransactionStatus;
  providerEventId: string | null;
  providerTransactionId: string | null;
  providerSessionId: string | null;
  providerRequestId: string | null;
  payloadHash: string | null;
  errorCode: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type IdentitySignalEvidence = SignalEvidenceDraft & {
  id: string;
  enterpriseId: string;
  subjectId: string;
  verificationRequestId: string;
  providerTransactionRecordId: string | null;
  createdAt: string;
};

export type AdapterCollectionResult = {
  transactionStatus: TransactionStatus;
  providerSessionId?: string | null;
  providerRequestId?: string | null;
  providerEventId?: string | null;
  providerTransactionId?: string | null;
  errorCode?: string | null;
  limitations: string[];
  evidence: SignalEvidenceDraft;
};

export type AdapterContext = {
  enterpriseId: string;
  subjectId: string;
  verificationRequestId: string;
  correlationId: string;
  purpose: string;
  input: Record<string, unknown>;
};

export type IdentityCallbackInput = {
  rawBody: string;
  signature: string;
  receivedAt: Date;
  correlationId: string;
};

export interface IdentitySignalAdapter {
  readonly providerId: string;
  readonly signals: readonly IdentitySignalType[];
  getCapabilities(): Promise<IdentityProviderCapability[]>;
  healthCheck(): Promise<IdentityProviderHealth>;
  collectSignal(signalType: IdentitySignalType, context: AdapterContext): Promise<AdapterCollectionResult>;
  verifyCallback(input: IdentityCallbackInput): Promise<SignalEvidenceDraft[]>;
}

export type ConfidenceResult = {
  score: number;
  band: "NONE" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  status: "INSUFFICIENT_EVIDENCE" | "PROVISIONAL" | "ESTABLISHED";
  verifiedSignalCount: number;
  totalSignalCount: number;
  contradictionCount: number;
  reasonCodes: IdentityReasonCode[];
  methodologyVersion: "identity-confidence-v1";
};

export type IdentityAuditEvent = {
  id: string;
  enterpriseId: string;
  subjectId: string | null;
  verificationRequestId: string | null;
  actorId: string | null;
  actorType: "USER" | "SYSTEM" | "PROVIDER";
  eventType: string;
  correlationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
