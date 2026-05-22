import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    const trustScore = calculateTrustScore(
      profileConsistency,
      syntheticRisk,
      confidence
    );

    const { error } = await supabase.from("trust_reports").insert({
      candidate_name: candidateName,
      media_type: mediaType,
      profile_consistency: profileConsistency,
      synthetic_risk: syntheticRisk,
      liveness_score: livenessScore,
      voice_clone_risk: voiceCloneRisk,
      video_deepfake_risk: videoDeepfakeRisk,
      image_authenticity_score: imageAuthenticityScore,
      provenance_status: provenanceStatus,
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
        trust_score: trustScore,
        provenance_status: provenanceStatus,
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
