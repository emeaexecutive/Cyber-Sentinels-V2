import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import {
  allowedEvidenceMediaTypes,
  allowedOriginStatuses,
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
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { calculateHumanPresence } from "@/lib/trust-engine/calculateHumanPresence";
import { calculateOriginTrace } from "@/lib/trust-engine/calculateOriginTrace";
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";
import type { OriginStatus } from "@/types/origin";

type InsertPayload = Record<string, unknown>;

function getSafeTrustReportError(error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return "Could not create trust report";
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return error instanceof Error ? error.message : "Could not create trust report";
}

function getMissingColumn(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : error instanceof Error
        ? error.message
        : "";
  const match = message.match(/'([^']+)' column|column "([^"]+)"/i);

  return match?.[1] ?? match?.[2] ?? null;
}

async function insertTrustReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fullPayload: InsertPayload,
  fallbackPayload: InsertPayload,
  ownerEmail: string
) {
  // Supabase schema must match this route for the extended insert. Deployment
  // deployments may lag migrations, so fall back to required/core fields.
  const extendedInsert = await supabase
    .from("trust_reports")
    .insert(fullPayload)
    .select("id")
    .single();

  if (!extendedInsert.error) {
    return { data: extendedInsert.data, error: null };
  }

  let payload = { ...fallbackPayload };
  let lastError = extendedInsert.error;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const fallbackInsert = await supabase
      .from("trust_reports")
      .insert(payload)
      .select("id")
      .single();

    if (!fallbackInsert.error) {
      return { data: fallbackInsert.data, error: null };
    }

    lastError = fallbackInsert.error;
    const missingColumn = getMissingColumn(fallbackInsert.error);

    if (!missingColumn || !(missingColumn in payload)) {
      break;
    }

    delete payload[missingColumn];
  }

  const minimumInsert = await supabase
    .from("trust_reports")
    .insert({
      owner_email: ownerEmail,
      candidate_name: fallbackPayload.candidate_name,
      profile_consistency: fallbackPayload.profile_consistency,
      synthetic_risk: fallbackPayload.synthetic_risk,
      confidence: fallbackPayload.confidence,
      trust_score: fallbackPayload.trust_score,
    })
    .select("id")
    .single();

  return minimumInsert.error
    ? { data: null, error: minimumInsert.error ?? lastError }
    : { data: minimumInsert.data, error: null };
}

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    // Safe beta logging only; never include secrets or private evidence bodies.
    console.warn(`${label} failed`, error);
  }
}

export async function POST(req: Request) {
  try {
    // Security: trust reports influence review decisions. Require auth,
    // validate all inputs, and never accept client-submitted final scores.
    const rateLimited = checkRateLimitPlaceholder({
      route: "/api/trust-reports",
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

    const candidateName = getRequiredText(formData, "candidate_name");
    const profileConsistency = getScore(formData, "profile_consistency", 80);
    const biometricConfidence = getScore(formData, "biometric_confidence", 70);
    const behaviouralConsistency = getScore(
      formData,
      "behavioural_consistency",
      profileConsistency
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
    const confidence = getScore(formData, "confidence", 85);
    const mediaType = getAllowedValue(
      formData,
      "media_type",
      allowedEvidenceMediaTypes,
      "image"
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
    const humanReviewRequired = originTrace.humanReviewRequired;
    const trustScore = calculateTrustScore({
      humanPresenceIndex,
      originTraceScore,
      livenessScore,
      imageAuthenticityScore,
      syntheticRisk,
      voiceCloneRisk,
      videoDeepfakeRisk,
      reviewOutcome: confidence > 80 ? "allow" : "manual_review",
    });

    const fullPayload = {
      owner_email: user.email ?? user.id,
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
      ...linkedInEvidence,
      confidence,
      trust_score: trustScore,
      report_type: "hiring_shield",
      ...requestRisk,
    };
    const fallbackPayload = {
      owner_email: user.email ?? user.id,
      candidate_name: candidateName,
      profile_consistency: profileConsistency,
      synthetic_risk: syntheticRisk,
      confidence,
      trust_score: trustScore,
      human_presence_index: humanPresenceIndex,
      origin_trace_score: originTraceScore,
      review_status: "pending",
      report_type: "hiring_shield",
    };
    const { error } = await insertTrustReport(
      supabase,
      fullPayload,
      fallbackPayload,
      user.email ?? user.id
    );

    if (error) throw error;

    await bestEffort("Required trust report signal", async () => {
      const { error: signalError } = await createSignal(
        supabase,
        `Hiring Shield report generated for ${candidateName}`
      );

      if (signalError) throw signalError;
    });

    await bestEffort("Required trust report audit", async () => {
      const { error: auditError } = await createAuditLog(
        supabase,
        "trust_report_created",
        user.email ?? candidateName,
        {
          candidate_name: candidateName,
          trust_score: trustScore,
          synthetic_risk: syntheticRisk,
          human_presence_index: humanPresenceIndex,
          origin_trace_score: originTraceScore,
        }
      );

      if (auditError) throw auditError;
    });

    if (linkedInEvidence.linkedin_url) {
      await bestEffort("LinkedIn trust report signals", async () => {
        await supabase
          .from("signals")
          .insert({ event: "LinkedIn profile submitted" });
        await supabase
          .from("signals")
          .insert({ event: "LinkedIn profile consistency check required" });
      });

      await bestEffort("LinkedIn trust report audit", async () => {
        await supabase.from("audit_logs").insert({
          event_type: "linkedin_profile_submitted",
          actor: user.email ?? user.id,
          metadata: {
            candidate_name: candidateName,
            linkedin_url: linkedInEvidence.linkedin_url,
            linkedin_claimed_company: linkedInEvidence.linkedin_claimed_company,
            linkedin_claimed_role: linkedInEvidence.linkedin_claimed_role,
            linkedin_verification_status:
              linkedInEvidence.linkedin_verification_status,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
        });
      });
    }

    await bestEffort("Trust report event writes", async () => {
      await recordTrustEvent(supabase, {
        signal: `Hiring Shield report generated for ${candidateName}`,
        audit: {
          eventType: "trust_report.created",
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
            ...requestRisk,
          },
        },
        trustUpdate: {
          action: "trust.update",
          actor: candidateName,
          subject: candidateName,
          score: trustScore,
          metadata: { source: "trust_report.created" },
        },
      });
    });

    await bestEffort("Trust report follow-up signals", async () => {
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
    });

    await bestEffort("Trust report audit logs", async () => {
      await supabase.from("audit_logs").insert({
        event_type: "human_presence_index_created",
        actor: candidateName,
        metadata: {
          candidate_name: candidateName,
          human_presence_index: humanPresenceIndex,
          biometric_confidence: biometricConfidence,
          behavioural_consistency: behaviouralConsistency,
          trust_timeline_score: trustTimelineScore,
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
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
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
      });

      if (humanReviewRequired) {
        await supabase.from("audit_logs").insert({
          event_type: "attribution_review_required",
          actor: candidateName,
          metadata: {
            candidate_name: candidateName,
            attribution_confidence: attributionConfidence,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
        });
      }

      if (provenanceStatus === "missing" || c2paStatus === "missing") {
        await supabase.from("audit_logs").insert({
          event_type: "provenance_missing",
          actor: candidateName,
          metadata: {
            candidate_name: candidateName,
            c2pa_status: c2paStatus,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
        });
      }

      if (watermarkStatus === "not_found") {
        await supabase.from("audit_logs").insert({
          event_type: "watermark_not_found",
          actor: candidateName,
          metadata: { candidate_name: candidateName, ...requestRisk },
          created_at: new Date().toISOString(),
        });
      }
    });

    return NextResponse.redirect(new URL("/hiring-shield", req.url));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid trust report input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: getSafeTrustReportError(error) },
      { status: 500 }
    );
  }
}
