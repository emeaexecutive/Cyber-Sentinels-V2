import "server-only";

import { verifyTimestampedHmacSha256 } from "../../callback-security.ts";
import { ProviderError } from "../../errors.ts";
import { recordProviderTelemetry } from "../../provider-telemetry.ts";
import type {
  CreateProviderSessionInput,
  IdentityProviderAdapter,
  ProviderCallbackEnvelope,
  ProviderContext,
  ProviderSessionStatus,
  VerifiedProviderCallback,
} from "../../types.ts";
import { HopaeClient } from "./hopae-client.ts";
import { inspectHopaeProviderConfig, requireHopaeProviderConfig } from "./hopae-config.ts";
import { normalizeHopaeIdentityEvidence } from "./hopae-normalizer.ts";
import { parseHopaeCallbackPayload, recordValue, stringValue } from "./hopae-types.ts";

function statusValue(status: string): ProviderSessionStatus {
  switch (status.toLowerCase()) {
    case "initiated": return "CREATED";
    case "awaiting_user_action": return "PENDING";
    case "authenticating": return "IN_PROGRESS";
    case "completed": return "COMPLETED";
    case "failed": return "FAILED";
    case "expired": return "EXPIRED";
    case "cancelled": return "CANCELLED";
    default: return "UNKNOWN";
  }
}

function safeClientAction(flowType: string | null, details: Record<string, unknown>) {
  const redirect = stringValue(details.authorizationUrl, details.redirectUrl, details.redirect_url);
  if (redirect && /^https:\/\//i.test(redirect)) return { type: "redirect" as const, value: redirect };
  const qr = stringValue(details.qrData, details.qr_data);
  if (flowType === "qr" && qr) return { type: "qr" as const, value: qr };
  if (flowType === "push") return { type: "wait" as const, value: "Complete the verification in your identity application." };
  return null;
}

export class HopaeAdapter implements IdentityProviderAdapter {
  readonly id = "hopae_connect" as const;
  readonly environment;
  private readonly config;
  private readonly client;

  constructor(input: { correlationId: string; fetcher?: typeof fetch }) {
    this.config = requireHopaeProviderConfig(input.correlationId);
    this.environment = this.config.environment;
    this.client = new HopaeClient(this.config, input.fetcher);
  }

  async createSession(input: CreateProviderSessionInput) {
    const startedAt = Date.now();
    recordProviderTelemetry({ event: "session_creation_started", provider: this.id, correlationId: input.context.correlationId, tenantId: input.context.tenantId });
    try {
      const result = await this.client.createVerification(input);
      recordProviderTelemetry({ event: "session_creation_completed", provider: this.id, correlationId: input.context.correlationId, tenantId: input.context.tenantId, providerSessionId: result.verification.verificationId, durationMs: Date.now() - startedAt, outcome: result.verification.status });
      return {
        provider: this.id,
        providerSessionId: result.verification.verificationId,
        status: statusValue(result.verification.status),
        expiresAt: result.verification.expiresAt,
        clientAction: safeClientAction(result.verification.flowType, result.verification.flowDetails),
        providerRequestId: result.requestId,
      };
    } catch (error) {
      recordProviderTelemetry({ event: "session_creation_failed", provider: this.id, correlationId: input.context.correlationId, tenantId: input.context.tenantId, durationMs: Date.now() - startedAt, outcome: error instanceof ProviderError ? error.code : "PROVIDER_UNAVAILABLE" });
      throw error;
    }
  }

  async retrieveSession(providerSessionId: string, context: ProviderContext) {
    const result = await this.client.getVerification(providerSessionId, context.correlationId);
    recordProviderTelemetry({ event: "session_retrieved", provider: this.id, correlationId: context.correlationId, tenantId: context.tenantId, providerSessionId, outcome: result.verification.status });
    return {
      provider: this.id,
      providerSessionId,
      status: statusValue(result.verification.status),
      expiresAt: result.verification.expiresAt,
      updatedAt: result.verification.updatedAt,
      providerRequestId: result.requestId,
    };
  }

  async verifyCallback(envelope: ProviderCallbackEnvelope): Promise<VerifiedProviderCallback> {
    recordProviderTelemetry({ event: "callback_received", provider: this.id, correlationId: envelope.correlationId });
    const verified = verifyTimestampedHmacSha256({
      provider: this.id,
      rawBody: envelope.rawBody,
      signatureHeader: envelope.signature,
      secret: this.config.webhookSecret,
      correlationId: envelope.correlationId,
      receivedAt: envelope.receivedAt,
      toleranceSeconds: this.config.callbackToleranceSeconds,
    });
    let payload: Record<string, unknown>;
    try { payload = recordValue(JSON.parse(envelope.rawBody)); } catch (error) {
      throw new ProviderError("PROVIDER_INVALID_RESPONSE", "Provider callback body is invalid.", "Verified callback was not valid JSON.", false, this.id, envelope.correlationId, { cause: error, httpStatus: 400 });
    }
    const callback = parseHopaeCallbackPayload(payload);
    if (!callback) {
      throw new ProviderError("PROVIDER_INVALID_RESPONSE", "Provider callback lacks required references.", "Hopae eventId, event, or data.verificationId is missing.", false, this.id, envelope.correlationId, { httpStatus: 400 });
    }
    recordProviderTelemetry({ event: "callback_verified", provider: this.id, correlationId: envelope.correlationId, providerSessionId: callback.verificationId, outcome: callback.eventType });
    return {
      provider: this.id,
      eventId: callback.eventId,
      eventType: callback.eventType,
      providerSessionId: callback.verificationId,
      providerTimestamp: callback.timestamp,
      signatureTimestamp: verified.timestamp,
      sourceDigest: verified.sourceDigest,
      payload,
    };
  }

  async normalizeEvidence(callback: VerifiedProviderCallback, context: ProviderContext) {
    const [status, userInfo] = await Promise.all([
      this.client.getVerification(callback.providerSessionId, context.correlationId),
      this.client.getUserInfo(callback.providerSessionId, context.correlationId),
    ]);
    const evidence = normalizeHopaeIdentityEvidence({ callback, context, statusPayload: status.payload, userInfoPayload: userInfo.payload });
    recordProviderTelemetry({ event: "evidence_normalized", provider: this.id, correlationId: context.correlationId, tenantId: context.tenantId, providerSessionId: callback.providerSessionId, outcome: evidence[0]?.outcome });
    return evidence;
  }

  async healthCheck() {
    const correlationId = crypto.randomUUID();
    const inspected = inspectHopaeProviderConfig();
    if (!inspected.configured) return {
      provider: this.id,
      environment: inspected.config.environment,
      configured: false,
      enabled: inspected.config.enabled,
      state: "MISCONFIGURED" as const,
      reason: inspected.config.enabled ? "Required configuration is missing or invalid." : "Provider is disabled.",
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      providerRequestId: null,
    };
    const startedAt = Date.now();
    try {
      const result = await this.client.health(correlationId);
      return { provider: this.id, environment: this.environment, configured: true, enabled: true, state: "HEALTHY" as const, reason: "Authenticated provider discovery succeeded.", checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, providerRequestId: result.requestId };
    } catch (error) {
      return { provider: this.id, environment: this.environment, configured: true, enabled: true, state: "UNAVAILABLE" as const, reason: error instanceof ProviderError ? error.code : "Health request failed.", checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, providerRequestId: null };
    }
  }
}
