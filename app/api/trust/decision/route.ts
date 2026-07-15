import { allowedEvidenceMediaTypes, allowedSubjectTypes } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { checkRequestRateLimit } from "@/lib/bot-protection";
import { evaluateDecisionEngine } from "@/lib/trust-engine/decisionEngine";
import { evaluatePolicyEngine } from "@/lib/trust-engine/policyEngine";
import {
  getAllowedString,
  getBoundedNumber,
  getOptionalBoolean,
  getOptionalString,
  readJsonObject,
  recordTrustApiCall,
  trustApiError,
  trustApiOk,
  validateTrustApiKey,
} from "@/lib/api/trustResponses";

const requestedActions = [
  "allow",
  "deny",
  "manual_review",
  "needs_more_evidence",
] as const;

function getNextStep(policyAction: string, decision: string) {
  if (policyAction === "block") return "Block action and escalate to admin";
  if (policyAction === "needs_more_evidence") return "Request more evidence";
  if (policyAction === "manual_review" || decision === "manual_review") {
    return "Route to manual review";
  }
  if (decision === "deny") return "Deny trust action";

  return "Proceed with allow path";
}

export async function POST(req: Request) {
  try {
    const apiKey = validateTrustApiKey(req);

    if (!apiKey.ok) {
      return trustApiError("Unauthorized", 401);
    }

    const rateLimited = checkRequestRateLimit(req, "/api/trust/decision", 120, 60_000);
    if (rateLimited) return rateLimited;

    // Partner-specific policy scopes remain a release blocker.
    const body = await readJsonObject(req);

    if (!body) {
      return trustApiError("Invalid decision input", 400);
    }

    const subjectType = getAllowedString(
      body,
      "subject_type",
      allowedSubjectTypes,
      "human"
    );
    const mediaType = getAllowedString(
      body,
      "media_type",
      allowedEvidenceMediaTypes,
      "image"
    );
    const requestedAction = getAllowedString(
      body,
      "requested_action",
      requestedActions,
      "manual_review"
    );
    const trustScore = getBoundedNumber(body, "trust_score", 50);
    const humanPresenceIndex = getBoundedNumber(
      body,
      "human_presence_index",
      50
    );
    const originTraceScore = getBoundedNumber(body, "origin_trace_score", 50);
    const syntheticRisk = getBoundedNumber(body, "synthetic_risk", 20);
    const livenessScore = getBoundedNumber(body, "liveness_score", 75);
    const videoDeepfakeRisk = getBoundedNumber(
      body,
      "video_deepfake_risk",
      15
    );
    const voiceCloneRisk = getBoundedNumber(body, "voice_clone_risk", 10);
    const imageAuthenticityScore = getBoundedNumber(
      body,
      "image_authenticity_score",
      80
    );
    const linkedinVerificationStatus =
      getOptionalString(body, "linkedin_verification_status") ?? "unverified";
    const provenanceStatus =
      getOptionalString(body, "provenance_status") ?? "unverified";
    const suspiciousActivity =
      getOptionalBoolean(body, "suspicious_activity") ?? false;

    const decisionResult = evaluateDecisionEngine({
      trust_score: trustScore,
      human_presence_index: humanPresenceIndex,
      origin_trace_score: originTraceScore,
      synthetic_risk: syntheticRisk,
      liveness_score: livenessScore,
      video_deepfake_risk: videoDeepfakeRisk,
      voice_clone_risk: voiceCloneRisk,
      image_authenticity_score: imageAuthenticityScore,
      provenance_status: provenanceStatus,
      review_status: requestedAction,
      suspicious_activity: suspiciousActivity,
    });
    const policyResult = evaluatePolicyEngine({
      requested_action: requestedAction,
      subject_type: subjectType,
      media_type: mediaType,
      has_trust_passport: getOptionalBoolean(body, "has_trust_passport"),
      has_human_presence_index: true,
      has_origin_trace: true,
      has_audit_log: getOptionalBoolean(body, "has_audit_log") ?? false,
      has_signal: getOptionalBoolean(body, "has_signal") ?? false,
      has_media_evidence: getOptionalBoolean(body, "has_media_evidence"),
      is_admin: getOptionalBoolean(body, "is_admin") ?? false,
      trust_score: trustScore,
      human_presence_index: humanPresenceIndex,
      origin_trace_score: originTraceScore,
      synthetic_risk: syntheticRisk,
      liveness_score: livenessScore,
      provenance_status: provenanceStatus,
      linkedin_url: getOptionalString(body, "linkedin_url", 300),
      linkedin_verification_status: linkedinVerificationStatus,
      suspicious_activity: suspiciousActivity,
    });
    const reasonCodes = [
      ...decisionResult.reasonCodes,
      ...policyResult.reason_codes,
    ];
    const uniqueReasonCodes = [...new Set(reasonCodes)];

    const supabase = await createClient();
    await recordTrustApiCall(supabase, req, {
      route: "/api/trust/decision",
      signal: "trust_api_decision_requested",
      metadata: {
        decision: decisionResult.decision,
        policy_result: policyResult.policy_result,
      },
    });

    return trustApiOk({
      decision: decisionResult.decision,
      policy_result: policyResult.policy_result,
      reason_codes: uniqueReasonCodes,
      recommended_next_step: getNextStep(
        policyResult.policy_action,
        decisionResult.decision
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return trustApiError("Invalid decision input", 400);
    }

    return trustApiError("Could not run trust decision", 500);
  }
}
