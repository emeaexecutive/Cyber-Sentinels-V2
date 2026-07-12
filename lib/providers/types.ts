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
