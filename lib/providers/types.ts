import type {
  ProviderVerificationState,
  TrustScoreRiskFlag,
} from "@/lib/trust-score";

export type VerificationProviderId =
  | "external_unattributed"
  | "world_id"
  | "stripe_identity"
  | "persona"
  | "entrust"
  | "onfido"
  | "hopae_connect"
  | "cloudflare_turnstile"
  | "fingerprint_device_risk";

export type VerificationProviderCategory =
  | "identity"
  | "proof_of_personhood"
  | "bot_protection"
  | "device_risk"
  | "future_adapter";

export type VerificationProviderStatus =
  | "configured"
  | "safely_disabled"
  | "placeholder"
  | "future";

export type ProviderRuntimeState =
  | "Live"
  | "Test Mode"
  | "Simulated"
  | "Awaiting Credentials"
  | "Degraded"
  | "Timeout"
  | "Failed"
  | "Disabled"
  | "Unsupported";

export type ProviderImplementationState =
  | "active"
  | "configured_unverified"
  | "placeholder"
  | "safely_disabled";

export type VerificationProviderDefinition = {
  id: VerificationProviderId;
  name: string;
  category: VerificationProviderCategory;
  status: VerificationProviderStatus;
  requiredEnv: string[];
  presentEnv: string[];
  missingEnv: string[];
  purpose: string;
  evidenceReference: string;
  notes: string;
  implementationState: ProviderImplementationState;
  usesMockData: boolean;
  safeFailure: boolean;
  authProtection: "session" | "server_form" | "not_exposed";
  replayIntegration: "normalized_evidence" | "not_connected";
  receiptIntegration: "normalized_evidence" | "not_connected";
};

export type VerificationProviderSignal = {
  providerId: VerificationProviderId;
  providerName: string;
  sourceType: "provider_signal" | "workflow_context" | "placeholder";
  identityConfidence: number;
  sessionIntegrity: number;
  providerVerificationState: ProviderVerificationState;
  riskFlags: TrustScoreRiskFlag[];
  governanceRecommendation: string;
  evidenceReferences: string[];
  summary: string;
};

export type NormalizedVerificationResponse = {
  provider_name: string;
  verification_state: ProviderVerificationState;
  identity_confidence: number;
  provider_signal: string;
  session_confidence: number;
  provider_reference: string;
  evidence_summary: string;
  risk_flags: TrustScoreRiskFlag[];
  governance_recommendation: string;
};

export type ProviderSignalInput = {
  providerId: VerificationProviderId;
  providerName?: string;
  sourceType?: VerificationProviderSignal["sourceType"];
  identityConfidence?: unknown;
  sessionIntegrity?: unknown;
  providerVerificationState?: unknown;
  riskFlags?: unknown;
  governanceRecommendation?: string | null;
  evidenceReferences?: string[] | null;
  summary?: string | null;
  providerReference?: string | null;
};

export type IdentityProviderId = "hopae_connect" | "world_id" | "stripe_identity";
export type ProviderEnvironment = "sandbox" | "production";
export type ProviderSessionStatus =
  | "CREATED"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "UNKNOWN";

export type IdentityEvidenceType =
  | "IDENTITY_SESSION"
  | "DOCUMENT_CHECK"
  | "LIVENESS_CHECK"
  | "FACE_MATCH_CHECK"
  | "ADDRESS_CHECK"
  | "AGE_CHECK"
  | "EMAIL_CHECK"
  | "PHONE_CHECK"
  | "PROVIDER_ASSERTION";

export type EvidenceOutcome =
  | "PASSED"
  | "FAILED"
  | "INCONCLUSIVE"
  | "NOT_PERFORMED"
  | "UNKNOWN";

export type ProviderContext = {
  tenantId: string;
  actorId: string;
  trustSessionId: string;
  correlationId: string;
};

export type CreateProviderSessionInput = {
  context: ProviderContext;
  purpose: string;
  redirectUri: string;
  idempotencyKey: string;
  requestedAssuranceLevel?: number;
};

export type CreateProviderSessionResult = {
  provider: IdentityProviderId;
  providerSessionId: string;
  status: ProviderSessionStatus;
  expiresAt: string | null;
  clientAction: { type: "redirect" | "qr" | "wait"; value: string } | null;
  providerRequestId: string | null;
};

export type RetrieveProviderSessionResult = {
  provider: IdentityProviderId;
  providerSessionId: string;
  status: ProviderSessionStatus;
  expiresAt: string | null;
  updatedAt: string | null;
  providerRequestId: string | null;
};

export type ProviderCallbackEnvelope = {
  rawBody: string;
  signature: string;
  receivedAt: Date;
  correlationId: string;
};

export type VerifiedProviderCallback = {
  provider: IdentityProviderId;
  eventId: string;
  eventType: string;
  providerSessionId: string;
  providerTimestamp: string | null;
  signatureTimestamp: number;
  sourceDigest: string;
  payload: Record<string, unknown>;
};

export type NormalizedIdentityEvidence = {
  schemaVersion: 1;
  idempotencyKey: string;
  tenantId: string;
  trustSessionId: string;
  correlationId: string;
  provider: IdentityProviderId;
  providerSessionId: string;
  providerEventId: string;
  evidenceType: IdentityEvidenceType;
  outcome: EvidenceOutcome;
  assuranceLevel: number | null;
  observedAt: string;
  expiresAt: string | null;
  sourceDigest: string;
  mappingVersion: string;
  attributes: Record<string, string | number | boolean | null>;
  limitations: string[];
};

export type ProviderHealthState = "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "MISCONFIGURED" | "UNKNOWN";
export type ProviderOperationalHealthSnapshot = {
  provider: IdentityProviderId;
  environment: ProviderEnvironment;
  configured: boolean;
  enabled: boolean;
  state: ProviderHealthState;
  reason: string;
  checkedAt: string;
  latencyMs: number | null;
  providerRequestId: string | null;
};

export interface IdentityProviderAdapter {
  readonly id: IdentityProviderId;
  readonly environment: ProviderEnvironment;
  createSession(input: CreateProviderSessionInput): Promise<CreateProviderSessionResult>;
  retrieveSession(providerSessionId: string, context: ProviderContext): Promise<RetrieveProviderSessionResult>;
  verifyCallback(envelope: ProviderCallbackEnvelope): Promise<VerifiedProviderCallback>;
  normalizeEvidence(callback: VerifiedProviderCallback, context: ProviderContext): Promise<NormalizedIdentityEvidence[]>;
  healthCheck(): Promise<ProviderOperationalHealthSnapshot>;
}
