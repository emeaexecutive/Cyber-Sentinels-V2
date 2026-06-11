import { allowedEvidenceMediaTypes, allowedSubjectTypes } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { calculateHumanPresence } from "@/lib/trust-engine/calculateHumanPresence";
import { calculateOriginTrace } from "@/lib/trust-engine/calculateOriginTrace";
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";
import {
  getAllowedString,
  getBoundedNumber,
  getOptionalString,
  getRecommendedAction,
  getRiskLevel,
  readJsonObject,
  recordTrustApiCall,
  trustApiError,
  trustApiOk,
  validateTrustApiKey,
} from "@/lib/api/trustResponses";
import type { OriginStatus } from "@/types/origin";

const originStatuses = [
  "unknown",
  "unverified",
  "verified",
  "missing",
  "tampered",
  "intact",
  "stripped",
  "found",
  "not_found",
  "broken",
] as const;

export async function POST(req: Request) {
  try {
    const apiKey = validateTrustApiKey(req);

    if (!apiKey.ok) {
      return trustApiError("Unauthorized", 401);
    }

    // Future: replace the in-memory placeholder with durable per-key rate
    // limits before exposing this endpoint publicly.
    const body = await readJsonObject(req);

    if (!body) {
      return trustApiError("Invalid trust check input", 400);
    }

    getAllowedString(body, "subject_type", allowedSubjectTypes, "human");
    getAllowedString(body, "media_type", allowedEvidenceMediaTypes, "image");

    const syntheticRisk = getBoundedNumber(body, "synthetic_risk", 20);
    const livenessScore = getBoundedNumber(body, "liveness_score", 75);
    const voiceCloneRisk = getBoundedNumber(body, "voice_clone_risk", 10);
    const videoDeepfakeRisk = getBoundedNumber(body, "video_deepfake_risk", 15);
    const imageAuthenticityScore = getBoundedNumber(
      body,
      "image_authenticity_score",
      80
    );
    const biometricConfidence = getBoundedNumber(
      body,
      "biometric_confidence",
      70
    );
    const behaviouralConsistency = getBoundedNumber(
      body,
      "behavioural_consistency",
      70
    );
    const trustTimelineScore = getBoundedNumber(
      body,
      "trust_timeline_score",
      50
    );
    const attributionConfidence = getBoundedNumber(
      body,
      "attribution_confidence",
      30
    );
    const modelFingerprintRisk = getBoundedNumber(
      body,
      "model_fingerprint_risk",
      20
    );
    const metadataIntegrity = getAllowedString(
      body,
      "metadata_integrity",
      originStatuses,
      "unknown"
    );
    const watermarkStatus = getAllowedString(
      body,
      "watermark_status",
      originStatuses,
      "unknown"
    );
    const c2paStatus = getAllowedString(
      body,
      "c2pa_status",
      originStatuses,
      "unverified"
    );
    const uploadChainStatus = getAllowedString(
      body,
      "upload_chain_status",
      originStatuses,
      "unknown"
    );
    const likelySourceType =
      getOptionalString(body, "likely_source_type") ?? "unknown";

    const humanPresenceIndex = calculateHumanPresence({
      biometricConfidence,
      behaviouralConsistency,
      livenessScore,
      imageAuthenticityScore,
      trustTimelineScore,
      voiceCloneRisk,
      videoDeepfakeRisk,
      syntheticRisk,
    });
    const originTrace = calculateOriginTrace({
      attributionConfidence,
      modelFingerprintRisk,
      metadataIntegrity: metadataIntegrity as OriginStatus,
      watermarkStatus: watermarkStatus as OriginStatus,
      c2paStatus: c2paStatus as OriginStatus,
      uploadChainStatus: uploadChainStatus as OriginStatus,
      likelySourceType,
    });
    const originTraceScore = originTrace.score;
    const trustScore = calculateTrustScore({
      humanPresenceIndex,
      originTraceScore,
      livenessScore,
      imageAuthenticityScore,
      syntheticRisk,
      voiceCloneRisk,
      videoDeepfakeRisk,
      reviewOutcome: "manual_review",
    });
    const riskLevel = getRiskLevel({
      trustScore,
      humanPresenceIndex,
      originTraceScore,
      syntheticRisk,
    });

    const supabase = await createClient();
    await recordTrustApiCall(supabase, req, {
      route: "/api/trust/check",
      signal: "trust_api_check_requested",
      metadata: {
        risk_level: riskLevel,
        trust_score: trustScore,
      },
    });

    return trustApiOk({
      trust_score: trustScore,
      human_presence_index: humanPresenceIndex,
      origin_trace_score: originTraceScore,
      risk_level: riskLevel,
      recommended_action: getRecommendedAction(riskLevel),
      orchestration_summary:
        "Detection and provenance are signals. Trust requires evidence, workflow integrity, governance review, timelines and human oversight.",
      signal_contributors: {
        provenance_signals: {
          origin_trace_score: originTraceScore,
          metadata_integrity: metadataIntegrity,
          watermark_status: watermarkStatus,
          c2pa_status: c2paStatus,
          upload_chain_status: uploadChainStatus,
        },
        workflow_integrity: {
          trust_timeline_score: trustTimelineScore,
          review_outcome: "manual_review",
        },
        session_continuity: {
          liveness_score: livenessScore,
          voice_clone_risk: voiceCloneRisk,
          video_signal_risk: videoDeepfakeRisk,
        },
        evidence_completeness: {
          image_signal_score: imageAuthenticityScore,
          attribution_confidence: attributionConfidence,
        },
        governance_review: {
          human_review_required: true,
          ai_decisioning: false,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return trustApiError("Invalid trust check input", 400);
    }

    return trustApiError("Could not run trust check", 500);
  }
}
