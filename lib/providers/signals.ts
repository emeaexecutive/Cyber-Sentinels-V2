import type {
  ProviderVerificationState,
  TrustScoreRiskFlag,
} from "@/lib/trust-score";
import { getVerificationProviderDefinition } from "./registry.ts";
import type {
  NormalizedVerificationResponse,
  ProviderSignalInput,
  VerificationProviderId,
  VerificationProviderSignal,
} from "./types.ts";

type JsonRecord = Record<string, unknown>;

const providerNames: Record<VerificationProviderId, string> = {
  external_unattributed: "External verification source",
  world_id: "World ID",
  stripe_identity: "Stripe Identity",
  persona: "Persona",
  entrust: "Entrust",
  onfido: "Onfido",
  hopae_connect: "Hopae Connect",
  cloudflare_turnstile: "Cloudflare Turnstile",
  fingerprint_device_risk: "Fingerprint / device risk",
};

const allowedRiskFlags = new Set<TrustScoreRiskFlag>([
  "missing_evidence",
  "session_integrity_anomaly",
  "injection_risk",
  "proxy_candidate_risk",
  "failed_governance_review",
  "provider_failed",
  "high_risk_context",
]);

function clamp(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeProviderState(value: unknown): ProviderVerificationState {
  const text = String(value ?? "").toLowerCase();

  if (["verified", "approved", "complete", "completed", "success", "passed"].includes(text)) {
    return "verified";
  }

  if (["failed", "rejected", "declined", "error"].includes(text)) {
    return "failed";
  }

  if (["pending", "review", "in_review", "processing"].includes(text)) {
    return "pending";
  }

  return "none";
}

function normalizeRiskFlags(value: unknown): TrustScoreRiskFlag[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((flag) => String(flag))
    .filter((flag): flag is TrustScoreRiskFlag =>
      allowedRiskFlags.has(flag as TrustScoreRiskFlag)
    );
}

function text(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value
      .trim()
      .slice(0, 500)
      .replace(
        /(secret|token|credential|authorization|api[_-]?key)\s*[:=]\s*\S+/gi,
        "$1=[redacted]"
      );
  }
  return fallback;
}

function references(value: unknown, fallback: string[]) {
  const candidates = Array.isArray(value) ? value : fallback;
  return candidates
    .map((item) => String(item).trim().slice(0, 200))
    .filter((item) => item && !/(secret|token|credential|authorization|api[_-]?key)\s*[:=]/i.test(item))
    .slice(0, 20);
}

function providerId(value: unknown): VerificationProviderId {
  const candidate = String(value ?? "");
  return candidate in providerNames
    ? (candidate as VerificationProviderId)
    : "external_unattributed";
}

export function normalizeProviderSignal(input: ProviderSignalInput): VerificationProviderSignal {
  const definition = getVerificationProviderDefinition(input.providerId);
  const providerName = input.providerName ?? definition?.name ?? providerNames[input.providerId];
  const providerState = normalizeProviderState(input.providerVerificationState);
  const riskFlags = normalizeRiskFlags(input.riskFlags);
  const evidenceReferences = references(input.evidenceReferences, [
    text(input.providerReference, ""),
    definition?.evidenceReference ?? "External verification source",
  ]).filter(Boolean);

  return {
    providerId: input.providerId,
    providerName,
    sourceType: input.sourceType ?? "provider_signal",
    identityConfidence: clamp(input.identityConfidence, 50),
    sessionIntegrity: clamp(input.sessionIntegrity, 50),
    providerVerificationState: providerState,
    riskFlags: providerState === "failed" && !riskFlags.includes("provider_failed")
      ? [...riskFlags, "provider_failed"]
      : riskFlags,
    governanceRecommendation:
      text(input.governanceRecommendation, providerState === "failed"
        ? "Escalate provider failure to governance review."
        : "Treat provider output as verification evidence for human review."),
    evidenceReferences,
    summary: text(
      input.summary,
      `${providerName} signal normalized as ${providerState} verification evidence.`
    ),
  };
}

export function toNormalizedVerificationResponse(
  signal: VerificationProviderSignal,
  providerReference?: string
): NormalizedVerificationResponse {
  return {
    provider_name: signal.providerName,
    verification_state: signal.providerVerificationState,
    identity_confidence: signal.identityConfidence,
    provider_signal: signal.providerVerificationState,
    session_confidence: signal.sessionIntegrity,
    provider_reference:
      providerReference ??
      signal.evidenceReferences[0] ??
      `${signal.providerName} evidence reference`,
    evidence_summary: signal.summary,
    risk_flags: signal.riskFlags,
    governance_recommendation: signal.governanceRecommendation,
  };
}

function objectValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function parseSnapshotSignals(snapshot: JsonRecord): VerificationProviderSignal[] {
  const rawSignals = snapshot.provider_signals;
  if (!Array.isArray(rawSignals)) return [];

  return rawSignals
    .map((item) => objectValue(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) =>
      normalizeProviderSignal({
        providerId: providerId(item.provider_id ?? item.providerId),
        providerName: text(item.provider_name ?? item.providerName, "External verification source"),
        sourceType: "provider_signal",
        identityConfidence: item.identity_confidence ?? item.identityConfidence,
        sessionIntegrity: item.session_integrity ?? item.sessionIntegrity,
        providerVerificationState:
          item.provider_verification_state ?? item.providerVerificationState ?? item.verification_status,
        riskFlags: Array.isArray(item.risk_flags) ? item.risk_flags : item.riskFlags,
        governanceRecommendation:
          text(item.governance_recommendation ?? item.governanceRecommendation, ""),
        evidenceReferences: Array.isArray(item.evidence_references)
          ? item.evidence_references.map(String)
          : Array.isArray(item.evidenceReferences)
            ? item.evidenceReferences.map(String)
            : null,
        summary: text(item.summary, ""),
      })
    );
}

export function buildWorkflowProviderSignals(input: {
  evidenceSnapshot?: JsonRecord | null;
  providerVerificationState?: unknown;
  identityConfidence?: unknown;
  sessionIntegrity?: unknown;
  riskFlags?: unknown;
  evidenceReferences?: string[];
} = {}): VerificationProviderSignal[] {
  const snapshot = input.evidenceSnapshot ?? {};
  const snapshotSignals = parseSnapshotSignals(snapshot);

  if (snapshotSignals.length) {
    return snapshotSignals;
  }

  const providerName = text(
    snapshot.provider_name ?? snapshot.providerName ?? snapshot.external_verification_source,
    "External verification source"
  );
  const normalizedProviderId = providerId(snapshot.provider_id ?? snapshot.providerId);
  const providerState =
    input.providerVerificationState ??
    snapshot.provider_verification_state ??
    snapshot.providerVerificationState ??
    snapshot.verification_status;

  const hasProviderEvidence = Boolean(
    input.providerVerificationState ||
    input.identityConfidence !== undefined ||
    input.sessionIntegrity !== undefined ||
    input.riskFlags ||
    input.evidenceReferences?.length ||
    snapshot.provider_id ||
    snapshot.providerId ||
    snapshot.provider_name ||
    snapshot.providerName ||
    snapshot.external_verification_source ||
    snapshot.provider_verification_state ||
    snapshot.providerVerificationState ||
    snapshot.verification_status
  );

  if (!hasProviderEvidence) {
    return [];
  }

  return [
    normalizeProviderSignal({
      providerId: normalizedProviderId,
      providerName,
      sourceType: "workflow_context",
      identityConfidence:
        input.identityConfidence ?? snapshot.identity_confidence ?? snapshot.identityConfidence,
      sessionIntegrity:
        input.sessionIntegrity ?? snapshot.session_integrity ?? snapshot.sessionIntegrity,
      providerVerificationState: providerState,
      riskFlags: input.riskFlags ?? snapshot.risk_flags,
      governanceRecommendation:
        "Use this provider signal as verification evidence; governance review determines workflow outcome.",
      evidenceReferences: input.evidenceReferences ?? [
        "Verification receipt",
        "Replay chronology",
        "Governance review",
      ],
      summary:
        "Provider signal normalized from workflow evidence. It supports trust scoring and replay, but does not make the final decision.",
    }),
  ];
}

export function summarizeProviderSignals(signals: VerificationProviderSignal[]) {
  const verifiedCount = signals.filter((signal) => signal.providerVerificationState === "verified").length;
  const failedCount = signals.filter((signal) => signal.providerVerificationState === "failed").length;
  const pendingCount = signals.filter((signal) => signal.providerVerificationState === "pending").length;

  return {
    verifiedCount,
    failedCount,
    pendingCount,
    providerVerificationState: failedCount
      ? ("failed" as ProviderVerificationState)
      : verifiedCount
        ? ("verified" as ProviderVerificationState)
        : pendingCount
          ? ("pending" as ProviderVerificationState)
          : ("none" as ProviderVerificationState),
    riskFlags: [...new Set(signals.flatMap((signal) => signal.riskFlags))],
    evidenceReferences: [...new Set(signals.flatMap((signal) => signal.evidenceReferences))],
  };
}
