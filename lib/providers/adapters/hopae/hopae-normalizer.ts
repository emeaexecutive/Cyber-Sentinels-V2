import { buildNormalizedIdentityEvidence } from "../../evidence-normalizer.ts";
import type { EvidenceOutcome, ProviderContext, VerifiedProviderCallback } from "../../types.ts";
import { parseHopaeUserInfo, parseHopaeVerificationResponse, type HopaeJson } from "./hopae-types.ts";

export const HOPAE_EVIDENCE_MAPPING_VERSION = "hopae-connect-v1-2026-07-17";

export function hopaeStatusOutcome(status: string): EvidenceOutcome {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "PASSED";
  if (["failed", "cancelled"].includes(normalized)) return "FAILED";
  if (normalized === "expired") return "INCONCLUSIVE";
  if (["initiated", "awaiting_user_action", "authenticating"].includes(normalized)) return "INCONCLUSIVE";
  return "UNKNOWN";
}

export function normalizeHopaeIdentityEvidence(input: {
  callback: VerifiedProviderCallback;
  context: ProviderContext;
  statusPayload: HopaeJson;
  userInfoPayload: HopaeJson;
}) {
  const session = parseHopaeVerificationResponse(input.statusPayload);
  const userInfo = parseHopaeUserInfo(input.userInfoPayload);
  const status = session?.status ?? "unknown";
  const observedAt = userInfo.verifiedAt ?? input.callback.providerTimestamp ?? new Date().toISOString();
  return [buildNormalizedIdentityEvidence({
    callback: input.callback,
    context: input.context,
    evidenceType: "IDENTITY_SESSION",
    outcome: hopaeStatusOutcome(status),
    assuranceLevel: userInfo.assuranceLevel,
    observedAt,
    expiresAt: session?.expiresAt ?? null,
    mappingVersion: HOPAE_EVIDENCE_MAPPING_VERSION,
    attributes: {
      providerId: userInfo.providerId ?? session?.providerId ?? null,
      providerStatus: status,
      verificationModel: userInfo.verificationModel,
      assuranceLabel: userInfo.assuranceLabel,
      acr: userInfo.acr,
      provenanceReported: userInfo.provenanceReported,
    },
    limitations: [
      "Hopae evidence is an input to the authoritative Cyber Sentinels Trust Decision; it never authorizes directly.",
      "No document, biometric, token, raw claim, or full provider payload is retained in normalized evidence.",
      "Hopae Connect returns an eID assertion and provenance; this adapter does not synthesize document, liveness, face-match, address, age, email, or phone checks.",
    ],
  })];
}
