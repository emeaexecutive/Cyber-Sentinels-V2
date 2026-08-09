import type { JsonPrimitive } from "../trust-events/types.ts";

export const trustSignalTypes = [
  "IDENTITY",
  "DOCUMENT",
  "EMAIL",
  "PHONE",
  "DEVICE",
  "SESSION",
  "BROWSER",
  "NETWORK",
  "VPN",
  "LOCATION",
  "BEHAVIOUR",
  "LIVENESS",
  "DEEPFAKE",
  "PROVIDER",
  "ENTERPRISE_POLICY",
  "MANUAL_REVIEW",
  "AI_AGENT",
  "AUTHORITY",
  "CREDENTIAL",
  "INTEGRATION",
  "SYSTEM",
] as const;
export const continuousEntityTypes = [
  "HUMAN",
  "AI_AGENT",
  "DEVICE",
  "ORGANISATION",
  "CREDENTIAL",
  "SESSION",
  "ENTERPRISE_WORKFLOW",
  "SERVICE",
  "APPLICATION",
  "MODEL_ENDPOINT",
  "MACHINE",
  "WORKLOAD",
] as const;

export const trustSignalSeverities = ["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const trustSignalStatuses = ["POSITIVE", "NEGATIVE", "INCONCLUSIVE", "UNAVAILABLE", "REVOKED", "INFORMATIONAL"] as const;
export const trustSignalProcessingStatuses = ["QUEUED", "PROCESSING", "PROCESSED", "FAILED_RETRYABLE", "FAILED_TERMINAL"] as const;
export const continuousPolicyActions = [
  "NO_ACTION",
  "RECORD_ONLY",
  "RECALCULATE",
  "WATCH",
  "ALERT",
  "STEP_UP_VERIFICATION",
  "RESTRICT",
  "SUSPEND",
  "REVOKE",
  "REQUIRE_MANUAL_REVIEW",
] as const;

export type TrustSignalType = (typeof trustSignalTypes)[number];
export type ContinuousEntityType = (typeof continuousEntityTypes)[number];
export type TrustSignalSeverity = (typeof trustSignalSeverities)[number];
export type TrustSignalStatus = (typeof trustSignalStatuses)[number];
export type TrustSignalProcessingStatus = (typeof trustSignalProcessingStatuses)[number];
export type ContinuousPolicyAction = (typeof continuousPolicyActions)[number];
export type TrustSignalMetadata = Record<string, JsonPrimitive | JsonPrimitive[]>;

export type TrustSignal = {
  id: string;
  tenantId: string;
  entityId: string;
  entityType: ContinuousEntityType;
  signalType: TrustSignalType;
  source: string;
  provider: string | null;
  observedAt: string;
  receivedAt: string;
  severity: TrustSignalSeverity;
  confidence: number;
  status: TrustSignalStatus;
  fingerprint: string;
  correlationId: string;
  causationId: string | null;
  metadata: TrustSignalMetadata;
  createdAt: string;
};

export type TrustSignalInput = {
  id?: unknown;
  entityId?: unknown;
  entityType?: unknown;
  signalType?: unknown;
  source?: unknown;
  provider?: unknown;
  observedAt?: unknown;
  receivedAt?: unknown;
  severity?: unknown;
  confidence?: unknown;
  status?: unknown;
  correlationId?: unknown;
  causationId?: unknown;
  metadata?: unknown;
  idempotencyKey?: unknown;
};

export type SignalDrift = {
  driftType: string;
  severity: TrustSignalSeverity;
  confidence: number;
  affectedDimensions: string[];
  previousValue: JsonPrimitive | null;
  currentValue: JsonPrimitive | null;
  recommendedAction: ContinuousPolicyAction;
  explanation: string;
  reasonCodes: string[];
};

export type SignalPolicyDecision = {
  policyDecisionId: string;
  policyId: string;
  policyVersion: string;
  action: ContinuousPolicyAction;
  reasonCodes: string[];
  affectedDimensions: string[];
  manualReviewRequired: boolean;
  material: boolean;
};

export type SignalIngestionResult = {
  signalId: string;
  status: "ACCEPTED" | "DUPLICATE";
  acceptedAt: string;
  duplicate: boolean;
  processingStatus: TrustSignalProcessingStatus;
};

export const trustDnaDimensions = [
  "Identity",
  "Documents",
  "Email",
  "Phone",
  "Device",
  "Location",
  "Behaviour",
  "Network",
  "Enterprise",
  "Historical",
  "AI Behaviour",
  "Provider Confidence",
] as const;
