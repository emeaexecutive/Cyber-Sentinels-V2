import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const subjectName = String(formData.get("subject_name") || "");
    const userEmail = String(formData.get("user_email") || "");
    const subjectType = String(formData.get("subject_type") || "human");
    const mediaType = getMediaType(formData.get("media_type"));
    const syntheticRisk = Number(formData.get("synthetic_risk") || 20);
    const livenessScore = Number(formData.get("liveness_score") || 75);
    const voiceCloneRisk = Number(formData.get("voice_clone_risk") || 10);
    const videoDeepfakeRisk = Number(formData.get("video_deepfake_risk") || 15);
    const provenanceStatus = String(
      formData.get("provenance_status") || "unverified"
    );

    const { error } = await supabase.from("passports").insert({
      user_email: userEmail,
      subject_name: subjectName,
      subject_type: subjectType,
      media_type: mediaType,
      synthetic_risk: syntheticRisk,
      liveness_score: livenessScore,
      voice_clone_risk: voiceCloneRisk,
      video_deepfake_risk: videoDeepfakeRisk,
      provenance_status: provenanceStatus,
      review_status: "pending",
      trust_score: 50,
      clearance: "pending",
      verified: false,
    });

    if (error) throw error;

    await supabase.from("signals").insert({
      event: `Passport created for ${subjectName}`,
    });

    await supabase.from("audit_logs").insert({
      event_type: "passport.created",
      actor: userEmail || "anonymous",
      metadata: {
        subject_name: subjectName,
        subject_type: subjectType,
        media_type: mediaType,
        provenance_status: provenanceStatus,
      },
    });

    return NextResponse.redirect(new URL("/passport", req.url));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create passport" },
      { status: 500 }
    );
  }
}
