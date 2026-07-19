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

export type IdentitySignalType = (typeof identitySignalTypes)[number];
export type SignalOutcome = "VERIFIED" | "FAILED" | "INCONCLUSIVE" | "UNAVAILABLE" | "BLOCKED" | "UNSUPPORTED";
export type TransactionStatus = "SUCCEEDED" | "INCONCLUSIVE" | "BLOCKED" | "UNAVAILABLE" | "FAILED";

export type SignalEvidenceDraft = {
  signalType: IdentitySignalType;
  providerId: string;
  outcome: SignalOutcome;
  confidence: number;
  serverVerified: boolean;
  sourceDigest?: string | null;
  reasonCodes: string[];
  limitations: string[];
  attributes?: Record<string, string | number | boolean | null>;
  observedAt: string;
  expiresAt?: string | null;
};

export type AdapterCollectionResult = {
  transactionStatus: TransactionStatus;
  providerSessionId?: string | null;
  providerRequestId?: string | null;
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

export interface IdentitySignalAdapter {
  readonly providerId: string;
  readonly signals: readonly IdentitySignalType[];
  collect(signalType: IdentitySignalType, context: AdapterContext): Promise<AdapterCollectionResult>;
}

export type ConfidenceResult = {
  score: number;
  band: "NONE" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  status: "INSUFFICIENT_EVIDENCE" | "PROVISIONAL" | "ESTABLISHED";
  verifiedSignalCount: number;
  totalSignalCount: number;
  reasonCodes: string[];
  methodologyVersion: "identity-confidence-v1";
};
