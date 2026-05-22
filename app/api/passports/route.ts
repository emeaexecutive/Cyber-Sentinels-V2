import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import { createClient } from "@/lib/supabase/server";
import { calculateHumanPresence } from "@/lib/trust-engine/calculateHumanPresence";
import { calculateOriginTrace } from "@/lib/trust-engine/calculateOriginTrace";
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";
import type { OriginStatus } from "@/types/origin";

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

    const subjectName = String(formData.get("subject_name") || "");
    const userEmail = String(formData.get("user_email") || "");
    const subjectType = String(formData.get("subject_type") || "human");
    const mediaType = getMediaType(formData.get("media_type"));
    const biometricConfidence = Number(
      formData.get("biometric_confidence") || 70
    );
    const behaviouralConsistency = Number(
      formData.get("behavioural_consistency") || 70
    );
    const syntheticRisk = Number(formData.get("synthetic_risk") || 20);
    const livenessScore = Number(formData.get("liveness_score") || 75);
    const voiceCloneRisk = Number(formData.get("voice_clone_risk") || 10);
    const videoDeepfakeRisk = Number(formData.get("video_deepfake_risk") || 15);
    const imageAuthenticityScore = Number(
      formData.get("image_authenticity_score") || 80
    );
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
    const humanReviewRequired = originTrace.humanReviewRequired;
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

    const { error } = await supabase.from("passports").insert({
      user_email: userEmail,
      subject_name: subjectName,
      subject_type: subjectType,
      media_type: mediaType,
      human_presence_index: humanPresenceIndex,
      biometric_confidence: biometricConfidence,
      behavioural_consistency: behaviouralConsistency,
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
      trust_score: trustScore,
      clearance: "pending",
      verified: false,
    });

    if (error) throw error;

    await recordTrustEvent(supabase, {
      signal: `Reality Passport created for ${subjectName}`,
      audit: {
        eventType: "reality_passport_created",
        actor: userEmail || "anonymous",
        metadata: {
          subject_name: subjectName,
          human_presence_index: humanPresenceIndex,
          origin_trace_score: originTraceScore,
        },
      },
      trustUpdate: {
        action: "trust.update",
        actor: userEmail || "anonymous",
        subject: subjectName,
        score: trustScore,
        metadata: { source: "passport.created" },
      },
    });

    await supabase.from("signals").insert({
      event: `Human Presence Index calculated for ${subjectName}: ${humanPresenceIndex}`,
    });

    await supabase.from("signals").insert({
      event: `Origin Trace generated for ${subjectName} with attribution confidence ${attributionConfidence}%`,
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
      event_type: "passport.created",
      actor: userEmail || "anonymous",
      metadata: {
        subject_name: subjectName,
        subject_type: subjectType,
        media_type: mediaType,
        image_authenticity_score: imageAuthenticityScore,
        origin_trace_score: originTraceScore,
        attribution_confidence: attributionConfidence,
        provenance_status: provenanceStatus,
      },
    });

    await supabase.from("audit_logs").insert({
      event_type: "human_presence_index_created",
      actor: userEmail || "anonymous",
      metadata: {
        subject_name: subjectName,
        human_presence_index: humanPresenceIndex,
        biometric_confidence: biometricConfidence,
        behavioural_consistency: behaviouralConsistency,
        trust_timeline_score: trustTimelineScore,
      },
    });

    await supabase.from("audit_logs").insert({
      event_type: "origin_trace_created",
      actor: userEmail || "anonymous",
      metadata: {
        subject_name: subjectName,
        attribution_confidence: attributionConfidence,
        likely_source_type: likelySourceType,
        model_fingerprint_risk: modelFingerprintRisk,
        origin_trace_score: originTraceScore,
      },
    });

    if (humanReviewRequired) {
      await supabase.from("audit_logs").insert({
        event_type: "attribution_review_required",
        actor: userEmail || "anonymous",
        metadata: { subject_name: subjectName, attribution_confidence: attributionConfidence },
      });
    }

    if (provenanceStatus === "missing" || c2paStatus === "missing") {
      await supabase.from("audit_logs").insert({
        event_type: "provenance_missing",
        actor: userEmail || "anonymous",
        metadata: { subject_name: subjectName, c2pa_status: c2paStatus },
      });
    }

    if (watermarkStatus === "not_found") {
      await supabase.from("audit_logs").insert({
        event_type: "watermark_not_found",
        actor: userEmail || "anonymous",
        metadata: { subject_name: subjectName },
      });
    }

    return NextResponse.redirect(new URL("/passport", req.url));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create passport" },
      { status: 500 }
    );
  }
}
