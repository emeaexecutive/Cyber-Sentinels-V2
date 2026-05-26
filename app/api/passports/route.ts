import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import {
  allowedEvidenceMediaTypes,
  allowedOriginStatuses,
  allowedSubjectTypes,
  checkRateLimitPlaceholder,
  configurationError,
  getAllowedValue,
  getOptionalText,
  getRequestRiskFields,
  getRequiredText,
  getScore,
  requireAuthenticatedUser,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { getLinkedInEvidence } from "@/lib/linkedin-verification";
import { calculateHumanPresence } from "@/lib/trust-engine/calculateHumanPresence";
import { calculateOriginTrace } from "@/lib/trust-engine/calculateOriginTrace";
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";
import type { OriginStatus } from "@/types/origin";

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

export async function POST(req: Request) {
  try {
    // Security: passport creation can affect trust state, so require Supabase
    // auth, validate every field server-side, and compute all scores here.
    const rateLimited = checkRateLimitPlaceholder({
      route: "/api/passports",
      req,
      limit: 20,
      windowMs: 60_000,
    });

    if (rateLimited) {
      return rateLimited;
    }

    const supabase = await createClient();
    const user = await requireAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const formData = await req.formData();
    const linkedInEvidence = getLinkedInEvidence(formData);

    const subjectName = getRequiredText(formData, "subject_name");
    const userEmail = user.email ?? user.id;
    const subjectType = getAllowedValue(
      formData,
      "subject_type",
      allowedSubjectTypes,
      "human"
    );
    const mediaType = getAllowedValue(
      formData,
      "media_type",
      allowedEvidenceMediaTypes,
      "image"
    );
    const biometricConfidence = getScore(formData, "biometric_confidence", 70);
    const behaviouralConsistency = getScore(
      formData,
      "behavioural_consistency",
      70
    );
    const syntheticRisk = getScore(formData, "synthetic_risk", 20);
    const livenessScore = getScore(formData, "liveness_score", 75);
    const voiceCloneRisk = getScore(formData, "voice_clone_risk", 10);
    const videoDeepfakeRisk = getScore(formData, "video_deepfake_risk", 15);
    const imageAuthenticityScore = getScore(
      formData,
      "image_authenticity_score",
      80
    );
    const provenanceStatus = getAllowedValue(
      formData,
      "provenance_status",
      allowedOriginStatuses,
      "unverified"
    );
    const trustTimelineScore = getScore(formData, "trust_timeline_score", 50);
    const attributionConfidence = getScore(
      formData,
      "attribution_confidence",
      30
    );
    const likelySourceType = getOptionalText(
      formData,
      "likely_source_type",
      "unknown"
    );
    const modelFingerprintRisk = getScore(
      formData,
      "model_fingerprint_risk",
      20
    );
    const metadataIntegrity = getAllowedValue(
      formData,
      "metadata_integrity",
      allowedOriginStatuses,
      "unknown"
    );
    const watermarkStatus = getAllowedValue(
      formData,
      "watermark_status",
      allowedOriginStatuses,
      "unknown"
    );
    const c2paStatus = getAllowedValue(
      formData,
      "c2pa_status",
      allowedOriginStatuses,
      provenanceStatus
    );
    const uploadChainStatus = getAllowedValue(
      formData,
      "upload_chain_status",
      allowedOriginStatuses,
      "unknown"
    );
    const requestRisk = {
      ...getRequestRiskFields(req),
      allowed_file_type: mediaType,
    };
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

    const { data: passport, error } = await supabase
      .from("passports")
      .insert({
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
        verification_status: "pending",
        reality_passport_status: "pending",
        ...linkedInEvidence,
        trust_score: trustScore,
        clearance: "pending",
        verified: false,
        ...requestRisk,
      })
      .select("id")
      .single();

    if (error) throw error;
    if (!passport) throw new Error("Could not create passport");

    await supabase.from("signals").insert({ event: "Verification started" });
    await supabase
      .from("signals")
      .insert({ event: "Human Presence calculated" });
    await supabase.from("signals").insert({ event: "Origin Trace created" });

    const { data: verificationCase, error: verificationCaseError } =
      await supabase
        .from("verification_cases")
        .insert({
          passport_id: passport.id,
          subject_name: subjectName,
          subject_type: subjectType,
          status: "pending",
          verification_status: "pending",
          decision_type: "manual_review",
          human_presence_index: humanPresenceIndex,
          origin_trace_score: originTraceScore,
          trust_score: trustScore,
          ...linkedInEvidence,
        })
        .select("id")
        .single();

    if (verificationCaseError) throw verificationCaseError;
    if (!verificationCase) throw new Error("Could not create verification case");

    await supabase.from("signals").insert({ event: "Review requested" });

    if (linkedInEvidence.linkedin_url) {
      await supabase
        .from("signals")
        .insert({ event: "LinkedIn profile submitted" });
      await supabase
        .from("signals")
        .insert({ event: "LinkedIn profile consistency check required" });

      await bestEffort("Passport LinkedIn audit", async () => {
        await supabase.from("audit_logs").insert({
          event_type: "linkedin_profile_submitted",
          actor: userEmail || "anonymous",
          metadata: {
            passport_id: passport.id,
            verification_case_id: verificationCase.id,
            subject_name: subjectName,
            linkedin_url: linkedInEvidence.linkedin_url,
            linkedin_claimed_company: linkedInEvidence.linkedin_claimed_company,
            linkedin_claimed_role: linkedInEvidence.linkedin_claimed_role,
            linkedin_verification_status:
              linkedInEvidence.linkedin_verification_status,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
          ...requestRisk,
        });
      });
    }

    await bestEffort("Passport verification audit", async () => {
      await supabase.from("audit_logs").insert({
        event_type: "verification_created",
        actor: userEmail || "anonymous",
        metadata: {
          passport_id: passport.id,
          verification_case_id: verificationCase.id,
          subject_name: subjectName,
          subject_type: subjectType,
          verification_status: "pending",
          decision_type: "manual_review",
          human_presence_index: humanPresenceIndex,
          origin_trace_score: originTraceScore,
          trust_score: trustScore,
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
        ...requestRisk,
      });
    });

    await recordTrustEvent(supabase, {
      signal: `Reality Passport created for ${subjectName}`,
      audit: {
        eventType: "reality_passport_created",
        actor: userEmail || "anonymous",
        metadata: {
          subject_name: subjectName,
          human_presence_index: humanPresenceIndex,
          origin_trace_score: originTraceScore,
          ...requestRisk,
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

    await bestEffort("Passport audit logs", async () => {
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
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
        ...requestRisk,
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
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
        ...requestRisk,
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
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
        ...requestRisk,
      });
    });

    if (humanReviewRequired) {
      await bestEffort("Passport attribution audit", async () => {
        await supabase.from("audit_logs").insert({
          event_type: "attribution_review_required",
          actor: userEmail || "anonymous",
          metadata: {
            subject_name: subjectName,
            attribution_confidence: attributionConfidence,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
          ...requestRisk,
        });
      });
    }

    if (provenanceStatus === "missing" || c2paStatus === "missing") {
      await bestEffort("Passport provenance audit", async () => {
        await supabase.from("audit_logs").insert({
          event_type: "provenance_missing",
          actor: userEmail || "anonymous",
          metadata: { subject_name: subjectName, c2pa_status: c2paStatus, ...requestRisk },
          created_at: new Date().toISOString(),
          ...requestRisk,
        });
      });
    }

    if (watermarkStatus === "not_found") {
      await bestEffort("Passport watermark audit", async () => {
        await supabase.from("audit_logs").insert({
          event_type: "watermark_not_found",
          actor: userEmail || "anonymous",
          metadata: { subject_name: subjectName, ...requestRisk },
          created_at: new Date().toISOString(),
          ...requestRisk,
        });
      });
    }

    return NextResponse.redirect(new URL("/passport", req.url));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid passport input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create passport" },
      { status: 500 }
    );
  }
}
