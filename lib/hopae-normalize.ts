import { calculateHopaeIdentityAssurance } from "@/lib/hopae-assurance";
import type { HopaeJson } from "@/lib/hopae";
import type { UpstreamIdentityProof } from "@/lib/identity-providers/types";

function objectValue(value: unknown): HopaeJson {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as HopaeJson)
    : {};
}

export function unwrapHopaePayload(payload: HopaeJson) {
  return Object.keys(objectValue(payload.data)).length
    ? objectValue(payload.data)
    : payload;
}

export function textValue(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value : null;
}

export function getHopaeVerificationId(payload: HopaeJson) {
  const data = unwrapHopaePayload(payload);
  return textValue(data.verificationId, data.verification_id, data.id);
}

export function normalizeHopaeResult(statusPayload: HopaeJson, userInfo: HopaeJson = {}) {
  const status = unwrapHopaePayload(statusPayload);
  const user = unwrapHopaePayload(userInfo);
  const provenance = objectValue(user.provenance ?? status.provenance);
  const rawLoa = user.hopae_loa ?? user.loa ?? status.hopae_loa ?? status.loa;
  const hopaeLoa = rawLoa == null || !Number.isFinite(Number(rawLoa)) ? null : Number(rawLoa);
  const statusText = textValue(status.status, status.verificationStatus) ?? "unknown";
  const providerId = textValue(status.providerId, status.provider_id, user.providerId, user.provider_id);
  const completed = ["completed", "verified", "success", "succeeded"].includes(
    statusText.toLowerCase()
  );
  const assurance = calculateHopaeIdentityAssurance({
    completed,
    loa: hopaeLoa,
    providerId,
    provenance,
  });
  const upstreamIdentityProof: UpstreamIdentityProof = {
    provider_name: "Hopae Connect",
    provider_type: "identity_verification_service",
    assurance_level: hopaeLoa,
    provenance,
    normalized_user: user,
    verification_status: statusText,
  };

  return {
    status: statusText,
    completed,
    providerId,
    flowType: textValue(status.flowType, status.flow_type),
    flowDetails: objectValue(status.flowDetails ?? status.flow_details),
    expiresAt: textValue(status.expiresAt, status.expires_at),
    completedAt:
      textValue(status.completedAt, status.completed_at) ??
      (completed ? new Date().toISOString() : null),
    normalizedUserData: user,
    provenance,
    verificationModel: textValue(
      user.verification_model,
      user.verificationModel,
      status.verification_model,
      status.verificationModel
    ),
    hopaeLoa,
    acr: textValue(user.acr, status.acr),
    amr: Array.isArray(user.amr) ? user.amr : Array.isArray(status.amr) ? status.amr : [],
    upstreamIdentityProof,
    ...assurance,
  };
}
