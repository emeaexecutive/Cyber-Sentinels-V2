export type HopaeJson = Record<string, unknown>;

export type HopaeVerificationResponse = {
  verificationId: string;
  status: string;
  providerId: string | null;
  flowType: string | null;
  flowDetails: Record<string, unknown>;
  expiresAt: string | null;
  updatedAt: string | null;
};

export type HopaeUserInfoSummary = {
  providerId: string | null;
  verificationModel: string | null;
  assuranceLevel: number | null;
  assuranceLabel: string | null;
  acr: string | null;
  verifiedAt: string | null;
  provenanceReported: boolean;
};

export type HopaeCallbackSummary = {
  eventId: string;
  eventType: string;
  verificationId: string;
  timestamp: string | null;
};

export const hopaeEventTypes = new Set([
  "verification.created",
  "verification.requested",
  "verification.workflow.started",
  "verification.user.authentication_started",
  "verification.user.authentication_succeeded",
  "verification.user.authentication_failed",
  "verification.completed",
  "verification.failed",
  "verification.workflow.cancelled",
  "verification.session.timed_out",
]);

export function recordValue(value: unknown): HopaeJson {
  return value && typeof value === "object" && !Array.isArray(value) ? value as HopaeJson : {};
}

export function stringValue(...values: unknown[]) {
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim());
  return typeof value === "string" ? value.trim() : null;
}

export function numberValue(...values: unknown[]) {
  const value = values.find((candidate) => candidate !== null && candidate !== undefined && Number.isFinite(Number(candidate)));
  return value === undefined ? null : Number(value);
}

export function parseHopaeVerificationResponse(payload: HopaeJson): HopaeVerificationResponse | null {
  const value = Object.keys(recordValue(payload.data)).length ? recordValue(payload.data) : payload;
  const verificationId = stringValue(value.verificationId, value.verification_id, value.id);
  const status = stringValue(value.status);
  if (!verificationId || !status) return null;
  return {
    verificationId,
    status,
    providerId: stringValue(value.providerId, value.provider_id),
    flowType: stringValue(value.flowType, value.flow_type),
    flowDetails: recordValue(value.flowDetails ?? value.flow_details),
    expiresAt: stringValue(value.expiresAt, value.expires_at, value.sessionExpiresAt),
    updatedAt: stringValue(value.updatedAt, value.updated_at),
  };
}

export function parseHopaeUserInfo(payload: HopaeJson): HopaeUserInfoSummary {
  const value = Object.keys(recordValue(payload.data)).length ? recordValue(payload.data) : payload;
  const provenance = recordValue(value.provenance);
  const metadata = recordValue(provenance._metadata);
  return {
    providerId: stringValue(value.provider_id, value.providerId, Array.isArray(value.amr) ? value.amr[0] : null),
    verificationModel: stringValue(value.verification_model, value.verificationModel),
    assuranceLevel: numberValue(value.hopae_loa, value.loa),
    assuranceLabel: stringValue(value.hopae_loa_label),
    acr: stringValue(value.acr),
    verifiedAt: stringValue(metadata.verified_at, metadata.verifiedAt),
    provenanceReported: Object.keys(provenance).length > 0,
  };
}

export function parseHopaeCallbackPayload(payload: HopaeJson): HopaeCallbackSummary | null {
  const data = recordValue(payload.data);
  const nestedEvent = recordValue(data.event);
  const eventId = stringValue(payload.eventId, payload.event_id);
  const eventType = stringValue(payload.event, nestedEvent.type);
  const verificationId = stringValue(data.verificationId, data.verification_id);
  if (!eventId || !eventType || !verificationId || !hopaeEventTypes.has(eventType)) return null;
  return { eventId, eventType, verificationId, timestamp: stringValue(payload.timestamp, nestedEvent.timestamp) };
}
