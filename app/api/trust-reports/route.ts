import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateHumanPresenceIndex } from "@/lib/human-presence-index";
import { calculateTrustScore } from "@/lib/trust-score";

const MEDIA_TYPES = ["image", "video", "audio", "document", "profile"] as const;

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

    await supabase.from("audit_logs").insert({
      event_type: "trust_report.created",
      actor: candidateName,
      metadata: {
        media_type: mediaType,
        synthetic_risk: syntheticRisk,
        image_authenticity_score: imageAuthenticityScore,
        human_presence_index: humanPresenceIndex,
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

    return NextResponse.redirect(new URL("/hiring-shield", req.url));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create trust report" },
      { status: 500 }
    );
  }
}
