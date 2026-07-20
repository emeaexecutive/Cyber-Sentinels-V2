import { createHmac, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "./hash.ts";
import type { EvidenceProviderAdapter, EnvelopeVerificationResult, NormalizedProviderEvent, ProviderCapabilities, ProviderEnvelope, RawProviderRequest } from "./types.ts";

function rawText(input: RawProviderRequest) { return new TextDecoder("utf-8", { fatal: true }).decode(input.rawBytes); }
function record(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function textValue(...values: unknown[]) { const value = values.find((entry) => typeof entry === "string" && entry.trim()); return typeof value === "string" ? value.trim() : null; }
function numberValue(...values: unknown[]) { const value = values.find((entry) => entry !== null && entry !== undefined && Number.isSafeInteger(Number(entry))); return value === undefined ? null : Number(value); }
function header(input: RawProviderRequest, name: string) { return input.headers[name.toLowerCase()] ?? ""; }

function parseTimestampedSignature(value: string) {
  const fields = new Map(value.split(",").map((part) => { const index = part.indexOf("="); return index > 0 ? [part.slice(0, index).trim(), part.slice(index + 1).trim()] : ["", ""]; }));
  const timestamp = /^\d+$/.test(fields.get("t") ?? "") ? Number(fields.get("t")) : null;
  const signature = /^[a-f0-9]{64}$/i.test(fields.get("v1") ?? "") ? String(fields.get("v1")).toLowerCase() : null;
  return { timestamp, signature };
}

function envelopeFromPayload(providerKey: string, payload: Record<string, unknown>): ProviderEnvelope {
  const data = record(payload.data);
  const nestedEvent = record(data.event);
  return {
    providerKey,
    payload,
    providerEventId: textValue(payload.eventId, payload.event_id, payload.id),
    transactionId: textValue(data.verificationId, data.verification_id, payload.transactionId, payload.transaction_id),
    deliveryId: textValue(payload.deliveryId, payload.delivery_id),
    nonce: textValue(payload.nonce, data.nonce),
    occurredAt: textValue(payload.timestamp, payload.occurredAt, payload.occurred_at, nestedEvent.timestamp),
    providerSequence: numberValue(payload.sequence, data.sequence),
    subjectId: textValue(data.subjectId, data.subject_id, data.verificationId, data.verification_id),
    workflowId: textValue(data.workflowId, data.workflow_id),
    sessionId: textValue(data.sessionId, data.session_id, data.verificationId, data.verification_id),
    authorityId: textValue(data.authorityId, data.authority_id),
  };
}

abstract class JsonAdapter implements EvidenceProviderAdapter {
  abstract key: string;
  abstract getCapabilities(): Promise<ProviderCapabilities>;
  abstract verifyEnvelope(input: RawProviderRequest): Promise<EnvelopeVerificationResult>;
  async parseEnvelope(input: RawProviderRequest) {
    let payload: unknown;
    try { payload = JSON.parse(rawText(input)); } catch { throw Object.assign(new Error("Provider envelope is not valid UTF-8 JSON."), { code: "PROVIDER_SCHEMA_INVALID", status: 400 }); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw Object.assign(new Error("Provider envelope must be a JSON object."), { code: "PROVIDER_SCHEMA_INVALID", status: 400 });
    return envelopeFromPayload(this.key, payload as Record<string, unknown>);
  }
  async deriveIdempotencyKey(envelope: ProviderEnvelope) {
    const reference = envelope.providerEventId ?? envelope.deliveryId ?? envelope.transactionId ?? envelope.nonce;
    if (!reference) throw Object.assign(new Error("Provider envelope has no stable idempotency reference."), { code: "PROVIDER_IDEMPOTENCY_REFERENCE_REQUIRED", status: 400 });
    return sha256Hex(`${this.key}:${reference}`);
  }
  abstract normalize(envelope: ProviderEnvelope): Promise<NormalizedProviderEvent[]>;
}

class HopaeTrustEventAdapter extends JsonAdapter {
  key = "hopae_connect";
  async getCapabilities(): Promise<ProviderCapabilities> {
    const enabled = process.env.HOPAE_ENABLED?.trim().toLowerCase() === "true";
    const configured = Boolean(process.env.HOPAE_WEBHOOK_SECRET?.trim());
    return { protocol: "HMAC", implementationStatus: "IMPLEMENTED", runtimeStatus: !enabled ? "DISABLED" : configured ? "AVAILABLE" : "BLOCKED_BY_CREDENTIALS", signatureVerification: true, serverVerification: false, positiveEvidence: true, reasonCodes: [...(!enabled ? ["HOPAE_DISABLED"] : []), ...(!configured ? ["HOPAE_WEBHOOK_SECRET_MISSING"] : []), "HOPAE_UPSTREAM_IDENTITY_RETRIEVAL_REQUIRED"] };
  }
  async verifyEnvelope(input: RawProviderRequest): Promise<EnvelopeVerificationResult> {
    const secret = process.env.HOPAE_WEBHOOK_SECRET?.trim() ?? "";
    const parsed = parseTimestampedSignature(header(input, "x-hopae-signature") || header(input, "hopae-signature"));
    if (!secret || !parsed.timestamp || !parsed.signature) return { verified: false, serverVerified: false, signatureTimestamp: null, nonce: null, reasonCodes: ["HOPAE_SIGNATURE_INVALID"], disposition: "REJECTED_SIGNATURE" };
    const tolerance = Math.max(1, Number(process.env.HOPAE_CALLBACK_TOLERANCE_SECONDS ?? 300));
    if (Math.abs(Math.floor(input.receivedAt.getTime() / 1000) - parsed.timestamp) > tolerance) return { verified: false, serverVerified: false, signatureTimestamp: new Date(parsed.timestamp * 1000).toISOString(), nonce: null, reasonCodes: ["HOPAE_SIGNATURE_EXPIRED"], disposition: "REJECTED_TIMESTAMP" };
    const expected = createHmac("sha256", secret).update(Buffer.concat([Buffer.from(`${parsed.timestamp}.`, "utf8"), Buffer.from(input.rawBytes)])).digest();
    const actual = Buffer.from(parsed.signature, "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { verified: false, serverVerified: false, signatureTimestamp: new Date(parsed.timestamp * 1000).toISOString(), nonce: null, reasonCodes: ["HOPAE_SIGNATURE_INVALID"], disposition: "REJECTED_SIGNATURE" };
    return { verified: true, serverVerified: false, signatureTimestamp: new Date(parsed.timestamp * 1000).toISOString(), nonce: null, reasonCodes: ["HOPAE_SIGNED_ENVELOPE_VERIFIED"] };
  }
  async normalize(envelope: ProviderEnvelope) {
    const eventName = textValue(envelope.payload.event, record(record(envelope.payload.data).event).type) ?? "unknown";
    if (!envelope.providerEventId || !envelope.transactionId) throw Object.assign(new Error("Hopae envelope lacks its documented eventId or verificationId."), { code: "PROVIDER_SCHEMA_INVALID", status: 400 });
    return [{
      eventType: "provider.envelope.accepted",
      subject: { type: "HUMAN" as const, id: envelope.subjectId ?? envelope.transactionId },
      actor: { type: "PROVIDER" as const, id: this.key },
      workflowId: envelope.workflowId, sessionId: envelope.sessionId ?? envelope.transactionId, authorityId: envelope.authorityId,
      normalizedFacts: { providerEventType: eventName, envelopeSignatureVerified: true, identityServerVerified: false },
      reasonCodes: ["HOPAE_SIGNED_ENVELOPE_VERIFIED", "UPSTREAM_IDENTITY_RETRIEVAL_REQUIRED"], evidenceReferences: [],
      occurredAt: envelope.occurredAt ?? new Date().toISOString(), providerSequence: envelope.providerSequence, supersedesEventId: null,
    }];
  }
}

class WorldIdTrustEventAdapter extends JsonAdapter {
  key = "world_id";
  async getCapabilities(): Promise<ProviderCapabilities> { return { protocol: "CHALLENGE_RESPONSE", implementationStatus: "PARTIALLY_IMPLEMENTED", runtimeStatus: "BLOCKED_BY_EXTERNAL_CONFIGURATION", signatureVerification: false, serverVerification: false, positiveEvidence: false, reasonCodes: ["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"] }; }
  async verifyEnvelope(input: RawProviderRequest): Promise<EnvelopeVerificationResult> {
    if (!input.authenticatedEnterpriseId || !input.authenticatedActorId) return { verified: false, serverVerified: false, signatureTimestamp: null, nonce: null, reasonCodes: ["AUTHENTICATION_REQUIRED"], disposition: "REJECTED_TENANT" };
    return { verified: true, serverVerified: false, signatureTimestamp: null, nonce: null, reasonCodes: ["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"], disposition: "INCONCLUSIVE" };
  }
  async parseEnvelope(input: RawProviderRequest) {
    const envelope = await super.parseEnvelope(input);
    envelope.providerEventId ??= `proof-digest-${sha256Hex(input.rawBytes)}`;
    return envelope;
  }
  async normalize(envelope: ProviderEnvelope) {
    return [{ eventType: "identity.world_id.proof_received", subject: { type: "HUMAN" as const, id: envelope.subjectId ?? "world-id-subject-unresolved" }, actor: { type: "USER" as const, id: envelope.authenticatedActorId ?? "authenticated-user" }, workflowId: envelope.workflowId, sessionId: envelope.sessionId, authorityId: null, normalizedFacts: { provider: "world_id", outcome: "INCONCLUSIVE", serverVerified: false, confidence: 0 }, reasonCodes: ["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"], evidenceReferences: [], occurredAt: envelope.occurredAt ?? new Date().toISOString(), providerSequence: envelope.providerSequence, supersedesEventId: null }];
  }
}

class UnsupportedTrustEventAdapter extends JsonAdapter {
  readonly key: string;
  constructor(key: string) { super(); this.key = key; }
  async getCapabilities(): Promise<ProviderCapabilities> { return { protocol: "UNSUPPORTED", implementationStatus: "UNSUPPORTED", runtimeStatus: "UNSUPPORTED", signatureVerification: false, serverVerification: false, positiveEvidence: false, reasonCodes: ["PROVIDER_ADAPTER_NOT_IMPLEMENTED"] }; }
  async verifyEnvelope(): Promise<EnvelopeVerificationResult> { return { verified: false, serverVerified: false, signatureTimestamp: null, nonce: null, reasonCodes: ["PROVIDER_ADAPTER_NOT_IMPLEMENTED"], disposition: "BLOCKED_PROVIDER" }; }
  async normalize(): Promise<NormalizedProviderEvent[]> { return []; }
}

const placeholderKeys = new Set(["email", "phone", "ip_reputation", "network_anonymity", "geolocation", "device_context", "stripe_identity", "persona", "entrust", "onfido"]);

export function resolveProviderAdapter(key: string): EvidenceProviderAdapter | null {
  if (key === "hopae" || key === "hopae_connect") return new HopaeTrustEventAdapter();
  if (key === "world-id" || key === "world_id") return new WorldIdTrustEventAdapter();
  if (placeholderKeys.has(key)) return new UnsupportedTrustEventAdapter(key);
  return null;
}

export async function providerHealthSnapshot() {
  const keys = ["hopae_connect", "world_id", ...placeholderKeys];
  return Promise.all(keys.map(async (key) => { const adapter = resolveProviderAdapter(key)!; return { providerKey: adapter.key, ...(await adapter.getCapabilities()) }; }));
}
