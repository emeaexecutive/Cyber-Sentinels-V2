import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const HOPAE_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

export type ProviderEvidenceSourceMode = "live" | "test" | "simulated";
export type ProviderEvidenceRuntimeState =
  | "Live"
  | "Test Mode"
  | "Simulated"
  | "Awaiting Credentials"
  | "Unavailable";

export type ProviderNeutralEvidence = {
  schemaVersion: 1;
  providerId: "hopae_connect";
  providerName: "Hopae Connect";
  capability: "identity_verification";
  runtimeState: ProviderEvidenceRuntimeState;
  sourceMode: ProviderEvidenceSourceMode;
  evidenceStatus: "verified" | "failed" | "pending" | "expired" | "unavailable";
  confidenceBand: "low" | "medium" | "high";
  confidence: number;
  reasonCodes: string[];
  providerReference: string;
  modelRulesetVersion: string | null;
  receivedTimestamp: string;
  latencyMs: number | null;
  freshness: { status: "fresh" | "stale" | "unknown"; ageMs: number | null };
  limitations: string[];
  retentionStatus: "normalized_only";
  correlationId: string;
  tenantId: string;
  workflowId: string;
};

export type EvidenceQualityResult = {
  status: "accepted" | "degraded" | "rejected";
  canInfluenceDecision: boolean;
  confidence: number;
  confidenceBand: ProviderNeutralEvidence["confidenceBand"];
  recommendedOutcome: "allow" | "step_up" | "review" | "block" | "insufficient_evidence";
  checks: Array<{ name: string; passed: boolean; critical: boolean; detail: string }>;
  reasonCodes: string[];
  limitations: string[];
};

type Json = Record<string, unknown>;

function objectValue(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function textValue(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : null;
}

function numberValue(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined && Number.isFinite(Number(item)));
  return value === undefined ? null : Number(value);
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function unwrap(payload: Json) {
  const data = objectValue(payload.data);
  return Object.keys(data).length ? data : payload;
}

function parseSignatureHeader(signatureHeader: string) {
  const compactMatch = signatureHeader.trim().match(/^(\d+)\.([a-fA-F0-9]{64})$/);
  if (compactMatch) return { timestamp: compactMatch[1], signature: compactMatch[2] };
  const parts = Object.fromEntries(signatureHeader.split(/[,;]/).map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  return { timestamp: parts.t || parts.timestamp || "", signature: parts.v1 || parts.signature || parts.sig || "" };
}

export function verifyHopaeWebhookSignature(rawBody: string, signatureHeader: string, secret: string) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const { timestamp, signature } = parseSignatureHeader(signatureHeader);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const supplied = signature.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

export function getHopaeWebhookTimestamp(signatureHeader: string) {
  const parsed = Number(parseSignatureHeader(signatureHeader).timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

function confidenceBand(confidence: number): ProviderNeutralEvidence["confidenceBand"] {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.55) return "medium";
  return "low";
}

function statusValue(value: unknown): ProviderNeutralEvidence["evidenceStatus"] {
  const status = String(value ?? "pending").toLowerCase();
  if (["completed", "verified", "success", "succeeded"].includes(status)) return "verified";
  if (["failed", "rejected", "denied", "error"].includes(status)) return "failed";
  if (["expired", "stale"].includes(status)) return "expired";
  if (["unavailable", "timeout"].includes(status)) return "unavailable";
  return "pending";
}

export function containsRestrictedProviderData(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRestrictedProviderData);
  if (!value || typeof value !== "object") return false;
  const restricted = /(^|_)(document|document_image|biometric|template|selfie|face|raw_token|challenge_token|credential|secret|access_token|id_token)($|_)/i;
  return Object.entries(value as Json).some(([key, nested]) => restricted.test(key) || containsRestrictedProviderData(nested));
}

export function normalizeHopaeProviderEvidence(input: {
  statusPayload: Json;
  userInfo?: Json;
  providerReference: string;
  correlationId: string;
  tenantId: string;
  workflowId: string;
  sourceMode: ProviderEvidenceSourceMode;
  runtimeState: ProviderEvidenceRuntimeState;
  receivedAt?: string;
  latencyMs?: number | null;
}): ProviderNeutralEvidence {
  const status = unwrap(input.statusPayload);
  const user = unwrap(input.userInfo ?? {});
  const evidenceStatus = statusValue(status.status ?? status.verificationStatus);
  const loa = numberValue(user.hopae_loa, user.loa, status.hopae_loa, status.loa);
  const provenance = objectValue(user.provenance ?? status.provenance);
  const model = textValue(user.verification_model, user.verificationModel, status.verification_model, status.verificationModel);
  const received = new Date(input.receivedAt ?? new Date().toISOString());
  const receivedTimestamp = Number.isNaN(received.getTime()) ? new Date().toISOString() : received.toISOString();
  const confidence = evidenceStatus === "verified"
    ? Math.min(0.96, Math.max(0.55, loa === null ? 0.62 : 0.5 + Math.min(4, Math.max(0, loa)) * 0.11) + (Object.keys(provenance).length ? 0.05 : 0))
    : evidenceStatus === "pending" ? 0.25 : 0.05;
  const reasonCodes = unique([
    `provider_status_${evidenceStatus}`,
    loa === null ? "assurance_level_not_reported" : `assurance_level_${loa}`,
    Object.keys(provenance).length ? "provenance_reported" : "provenance_not_reported",
    model ? "model_or_ruleset_reported" : "model_or_ruleset_not_reported",
  ]);
  const limitations = unique([
    "Provider evidence is an input to authority and policy evaluation, not an authorization decision.",
    input.sourceMode !== "live" ? `Provider source mode is ${input.sourceMode}; no production availability claim is made.` : null,
    !Object.keys(provenance).length ? "Provider provenance was not reported." : null,
    !model ? "Provider model or ruleset version was not reported." : null,
  ]);

  return {
    schemaVersion: 1,
    providerId: "hopae_connect",
    providerName: "Hopae Connect",
    capability: "identity_verification",
    runtimeState: input.runtimeState,
    sourceMode: input.sourceMode,
    evidenceStatus,
    confidenceBand: confidenceBand(confidence),
    confidence: Number(confidence.toFixed(2)),
    reasonCodes,
    providerReference: input.providerReference,
    modelRulesetVersion: model,
    receivedTimestamp,
    latencyMs: Number.isFinite(input.latencyMs ?? NaN) ? Math.max(0, Number(input.latencyMs)) : null,
    freshness: { status: "fresh", ageMs: 0 },
    limitations,
    retentionStatus: "normalized_only",
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    workflowId: input.workflowId,
  };
}

export function evaluateProviderEvidenceQuality(input: {
  evidence: ProviderNeutralEvidence;
  expectedTenantId: string;
  expectedWorkflowId: string;
  expectedCorrelationId: string;
  duplicateEvent?: boolean;
  conflictingEvidence?: boolean;
  restrictedDataDetected?: boolean;
  nowMs?: number;
  maxAgeMs?: number;
}): EvidenceQualityResult {
  const now = input.nowMs ?? Date.now();
  const received = Date.parse(input.evidence.receivedTimestamp);
  const ageMs = Number.isFinite(received) ? Math.max(0, now - received) : null;
  const fresh = ageMs !== null && ageMs <= (input.maxAgeMs ?? 10 * 60 * 1000);
  const complete = Boolean(
    input.evidence.providerReference && input.evidence.correlationId && input.evidence.tenantId &&
    input.evidence.workflowId && input.evidence.receivedTimestamp && input.evidence.reasonCodes.length
  );
  const contextMatches = input.evidence.tenantId === input.expectedTenantId &&
    input.evidence.workflowId === input.expectedWorkflowId &&
    input.evidence.correlationId === input.expectedCorrelationId;
  const providerAvailable = !["Awaiting Credentials", "Unavailable"].includes(input.evidence.runtimeState) &&
    input.evidence.evidenceStatus !== "unavailable";
  const hasEvidence = input.evidence.evidenceStatus === "verified";
  const checks: EvidenceQualityResult["checks"] = [
    { name: "provenance", passed: input.evidence.reasonCodes.includes("provenance_reported"), critical: false, detail: "Provider provenance must remain attributable when supplied." },
    { name: "freshness", passed: fresh, critical: false, detail: ageMs === null ? "Evidence timestamp is invalid." : `Evidence age is ${ageMs} ms.` },
    { name: "completeness", passed: complete, critical: false, detail: "The provider-neutral contract requires provider, context, timestamp and reason fields." },
    { name: "consistency", passed: contextMatches, critical: true, detail: "Tenant, workflow and correlation references must match the server-side session." },
    { name: "duplication", passed: !input.duplicateEvent, critical: true, detail: "A provider event may affect a decision only once." },
    { name: "provider health", passed: providerAvailable, critical: false, detail: `Runtime state is ${input.evidence.runtimeState}.` },
    { name: "model or ruleset staleness", passed: Boolean(input.evidence.modelRulesetVersion), critical: false, detail: input.evidence.modelRulesetVersion ?? "Version was not reported." },
    { name: "missing evidence", passed: hasEvidence, critical: false, detail: `Evidence status is ${input.evidence.evidenceStatus}.` },
    { name: "conflicting evidence", passed: !input.conflictingEvidence, critical: true, detail: "Critical conflicts are routed to review and are never averaged away." },
    { name: "restricted data", passed: !input.restrictedDataDetected, critical: true, detail: "Raw documents, biometrics, secrets and challenge tokens must not be persisted." },
  ];
  const criticalFailure = checks.some((check) => check.critical && !check.passed);
  const degraded = checks.some((check) => !check.passed);
  const confidence = criticalFailure ? 0 : degraded ? Math.min(input.evidence.confidence, 0.54) : input.evidence.confidence;
  const reasonCodes = unique(checks.filter((check) => !check.passed).map((check) => `quality_${check.name.replace(/\s+/g, "_")}_failed`));
  const recommendedOutcome: EvidenceQualityResult["recommendedOutcome"] = criticalFailure
    ? input.restrictedDataDetected || !contextMatches ? "block" : "review"
    : !hasEvidence || !complete ? "insufficient_evidence"
      : !fresh || !providerAvailable ? "step_up"
        : degraded ? "review" : "allow";

  return {
    status: criticalFailure ? "rejected" : degraded ? "degraded" : "accepted",
    canInfluenceDecision: !criticalFailure && hasEvidence,
    confidence: Number(confidence.toFixed(2)),
    confidenceBand: confidenceBand(confidence),
    recommendedOutcome,
    checks,
    reasonCodes,
    limitations: checks.filter((check) => !check.passed).map((check) => check.detail),
  };
}

export function safeHopaeWebhookEnvelope(payload: Json) {
  const data = unwrap(payload);
  const metadata = objectValue(data.metadata);
  return {
    eventId: textValue(data.eventId, data.event_id, payload.eventId, payload.event_id),
    eventType: textValue(data.eventType, data.event_type, payload.eventType, payload.event_type) ?? "verification.updated",
    verificationId: textValue(data.verificationId, data.verification_id, metadata.verificationId, metadata.verification_id),
    tenantId: textValue(metadata.tenantId, metadata.tenant_id),
    workflowId: textValue(metadata.workflowId, metadata.workflow_id),
    correlationId: textValue(metadata.correlationId, metadata.correlation_id),
  };
}

export function digestProviderEvent(rawBody: string) {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export function webhookTimestampWithinTolerance(timestampSeconds: number | null, nowMs = Date.now(), toleranceMs = HOPAE_WEBHOOK_TOLERANCE_MS) {
  return timestampSeconds !== null && Number.isFinite(timestampSeconds) && Math.abs(nowMs - timestampSeconds * 1000) <= toleranceMs;
}
