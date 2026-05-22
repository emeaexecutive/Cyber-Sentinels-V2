import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateHumanPresenceIndex } from "@/lib/human-presence-index";
import {
  calculateOriginTraceScore,
  requiresAttributionReview,
} from "@/lib/origin-trace";
import { calculateTrustScore } from "@/lib/trust-score";

const MEDIA_TYPES = ["image", "video", "audio", "document", "profile", "agent"] as const;

function getMediaType(value: FormDataEntryValue | null) {
  const mediaType = String(value || "profile");

  return MEDIA_TYPES.includes(mediaType as (typeof MEDIA_TYPES)[number])
    ? mediaType
    : "profile";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const supabase = await createClient();

    const candidateName = String(formData.get("candidate_name") || "Candidate");
    const profileConsistency = Number(formData.get("profile_consistency") || 80);
    const biometricConfidence = Number(
      formData.get("biometric_confidence") || 70
    );
    const behaviouralConsistency = Number(
      formData.get("behavioural_consistency") || profileConsistency
    );
    const syntheticRisk = Number(formData.get("synthetic_risk") || 20);
    const livenessScore = Number(formData.get("liveness_score") || 75);
    const voiceCloneRisk = Number(formData.get("voice_clone_risk") || 10);
    const videoDeepfakeRisk = Number(formData.get("video_deepfake_risk") || 15);
    const imageAuthenticityScore = Number(
      formData.get("image_authenticity_score") || 80
    );
    const confidence = Number(formData.get("confidence") || 85);
    const mediaType = getMediaType(formData.get("media_type"));
    const provenanceStatus = String(
      formData.get("provenance_status") || "unverified"
    );
    const trustTimelineScore = Number(
      formData.get("trust_timeline_score") || 50
    );
    const attributionConfidence = Number(
      formData.get("attribution_confidence") || 30
    );
    const likelySourceType = String(formData.get("likely_source_type") || "unknown");
    const modelFingerprintRisk = Number(
      formData.get("model_fingerprint_risk") || 20
    );
    const metadataIntegrity = String(formData.get("metadata_integrity") || "unknown");
    const watermarkStatus = String(formData.get("watermark_status") || "unknown");
    const c2paStatus = String(formData.get("c2pa_status") || provenanceStatus);
    const uploadChainStatus = String(
      formData.get("upload_chain_status") || "unknown"
    );

    const trustScore = calculateTrustScore(
      profileConsistency,
      syntheticRisk,
      confidence
    );
    const humanPresenceIndex = calculateHumanPresenceIndex({
      biometricConfidence,
      behaviouralConsistency,
      livenessScore,
      imageAuthenticityScore,
      trustTimelineScore,
      voiceCloneRisk,
      videoDeepfakeRisk,
      syntheticRisk,
    });
    const originTraceScore = calculateOriginTraceScore({
      attributionConfidence,
      modelFingerprintRisk,
      metadataIntegrity,
      watermarkStatus,
      c2paStatus,
      uploadChainStatus,
    });
    const humanReviewRequired = requiresAttributionReview({
      attributionConfidence,
      modelFingerprintRisk,
      metadataIntegrity,
      watermarkStatus,
      c2paStatus,
      uploadChainStatus,
    });

    const { error } = await supabase.from("trust_reports").insert({
      candidate_name: candidateName,
      media_type: mediaType,
      human_presence_index: humanPresenceIndex,
      biometric_confidence: biometricConfidence,
      behavioural_consistency: behaviouralConsistency,
      profile_consistency: profileConsistency,
      synthetic_risk: syntheticRisk,
      liveness_score: livenessScore,
      voice_clone_risk: voiceCloneRisk,
      video_deepfake_risk: videoDeepfakeRisk,
      image_authenticity_score: imageAuthenticityScore,
      origin_trace_score: originTraceScore,
      attribution_confidence: attributionConfidence,
      likely_source_type: likelySourceType,
      model_fingerprint_risk: modelFingerprintRisk,
      metadata_integrity: metadataIntegrity,
      watermark_status: watermarkStatus,
      c2pa_status: c2paStatus,
      upload_chain_status: uploadChainStatus,
      human_review_required: humanReviewRequired,
      provenance_status: provenanceStatus,
      trust_timeline_score: trustTimelineScore,
      review_status: "pending",
      confidence,
      trust_score: trustScore,
      report_type: "hiring_shield",
    });

    if (error) throw error;

    await supabase.from("signals").insert({
      event: `Hiring Shield report generated for ${candidateName}`,
    });

    await supabase.from("signals").insert({
      event: `Origin Trace generated for ${candidateName} with attribution confidence ${attributionConfidence}%`,
    });

    if (metadataIntegrity === "stripped") {
      await supabase.from("signals").insert({ event: "Metadata stripped" });
    }

    if (watermarkStatus === "not_found") {
      await supabase.from("signals").insert({ event: "Watermark not found" });
    }

    if (humanReviewRequired) {
      await supabase.from("signals").insert({ event: "Human review required" });
    }

    await supabase.from("audit_logs").insert({
      event_type: "trust_report.created",
      actor: candidateName,
      metadata: {
        media_type: mediaType,
        synthetic_risk: syntheticRisk,
        image_authenticity_score: imageAuthenticityScore,
        human_presence_index: humanPresenceIndex,
        origin_trace_score: originTraceScore,
        attribution_confidence: attributionConfidence,
        trust_score: trustScore,
        provenance_status: provenanceStatus,
      },
    });

    await supabase.from("audit_logs").insert({
      event_type: "human_presence_index_created",
      actor: candidateName,
      metadata: {
        candidate_name: candidateName,
        human_presence_index: humanPresenceIndex,
        biometric_confidence: biometricConfidence,
        behavioural_consistency: behaviouralConsistency,
        trust_timeline_score: trustTimelineScore,
      },
    });

    await supabase.from("audit_logs").insert({
      event_type: "origin_trace_created",
      actor: candidateName,
      metadata: {
        candidate_name: candidateName,
        attribution_confidence: attributionConfidence,
        likely_source_type: likelySourceType,
        model_fingerprint_risk: modelFingerprintRisk,
        origin_trace_score: originTraceScore,
      },
    });

    if (humanReviewRequired) {
      await supabase.from("audit_logs").insert({
        event_type: "attribution_review_required",
        actor: candidateName,
        metadata: { candidate_name: candidateName, attribution_confidence: attributionConfidence },
      });
    }

    if (provenanceStatus === "missing" || c2paStatus === "missing") {
      await supabase.from("audit_logs").insert({
        event_type: "provenance_missing",
        actor: candidateName,
        metadata: { candidate_name: candidateName, c2pa_status: c2paStatus },
      });
    }

    if (watermarkStatus === "not_found") {
      await supabase.from("audit_logs").insert({
        event_type: "watermark_not_found",
        actor: candidateName,
        metadata: { candidate_name: candidateName },
      });
    }

    return NextResponse.redirect(new URL("/hiring-shield", req.url));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create trust report" },
      { status: 500 }
    );
  }
}
