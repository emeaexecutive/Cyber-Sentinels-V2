import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import { createNotification } from "@/lib/communications/createNotification";
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
import { checkUsageLimit } from "@/lib/billing/checkUsageLimit";
import { getLinkedInEvidence } from "@/lib/linkedin-verification";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { calculateHumanPresence } from "@/lib/trust-engine/calculateHumanPresence";
import { calculateOriginTrace } from "@/lib/trust-engine/calculateOriginTrace";
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";
import type { OriginStatus } from "@/types/origin";

type SupabaseWriteError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.error(`${label} failed`, error);
  }
}

function getSupabaseErrorFields(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      message: error instanceof Error ? error.message : undefined,
      details: undefined,
      hint: undefined,
    };
  }

  const supabaseError = error as SupabaseWriteError;

  return {
    message:
      typeof supabaseError.message === "string"
        ? supabaseError.message
        : undefined,
    details:
      typeof supabaseError.details === "string"
        ? supabaseError.details
        : undefined,
    hint: typeof supabaseError.hint === "string" ? supabaseError.hint : undefined,
  };
}

function logSupabaseWriteError(label: string, error: unknown) {
  const fields = getSupabaseErrorFields(error);

  console.error(`${label} failed`, {
    ...fields,
    code:
      error && typeof error === "object" && "code" in error
        ? (error as SupabaseWriteError).code
        : undefined,
  });
}

function getPassportErrorResponse(error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "Could not create passport" };
  }

  const fields = getSupabaseErrorFields(error);

  return {
    ok: false,
    error:
      fields.message ??
      (error instanceof Error ? error.message : "Could not create passport"),
    details: fields.details,
    hint: fields.hint,
  };
}

async function insertSignal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { error } = await supabase.from("signals").insert({ event, metadata });

    if (error) {
      logSupabaseWriteError("signals insert", error);
    }
  } catch (error) {
    logSupabaseWriteError("signals insert", error);
  }
}

async function insertAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: Record<string, unknown>
) {
  try {
    const { event_type, actor, metadata, created_at } = values;
    const { error } = await supabase.from("audit_logs").insert({
      event_type,
      actor,
      metadata: {
        ...(metadata && typeof metadata === "object" ? metadata : {}),
        actor,
      },
      created_at,
    });

    if (error) {
      logSupabaseWriteError("audit_logs insert", error);
    }
  } catch (error) {
    logSupabaseWriteError("audit_logs insert", error);
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

    const usageLimit = await checkUsageLimit(supabase, user, "passport");

    if (!usageLimit.ok) {
      return NextResponse.json(
        { ok: false, error: usageLimit.reason },
        { status: 403 }
      );
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

    if (error) {
      logSupabaseWriteError("passport insert", error);
      throw error;
    }
    if (!passport) throw new Error("Could not create passport");

    const passportMetadata = {
      passport_id: passport.id,
      subject_name: subjectName,
      subject_type: subjectType,
      actor: userEmail,
    };

    await bestEffort("Required passport signal", async () => {
      const { error: signalError } = await createSignal(
        supabase,
        `Trust Passport created for ${subjectName}`,
        {
          ...passportMetadata,
          trust_score: trustScore,
        }
      );

      if (signalError) {
        logSupabaseWriteError("signals insert", signalError);
        throw signalError;
      }
    });

    await bestEffort("Required passport audit", async () => {
      const { error: auditError } = await createAuditLog(
        supabase,
        "passport_created",
        user.email ?? subjectName,
        {
          ...passportMetadata,
          trust_score: trustScore,
        }
      );

      if (auditError) {
        logSupabaseWriteError("audit_logs insert", auditError);
        throw auditError;
      }
    });

    await bestEffort("Passport notification", async () => {
      await createNotification(supabase, {
        userId: user.id,
        title: "Trust Passport created",
        body: `Trust Passport created for ${subjectName}.`,
        notificationType: "passport_created",
        actor: userEmail,
        metadata: passportMetadata,
      });
    });

    await insertSignal(supabase, "Human Presence calculated", {
      ...passportMetadata,
      human_presence_index: humanPresenceIndex,
    });
    await insertSignal(supabase, "Origin Trace created", {
      ...passportMetadata,
      origin_trace_score: originTraceScore,
    });

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

    if (verificationCaseError) {
      logSupabaseWriteError("verification_cases insert", verificationCaseError);
      throw verificationCaseError;
    }
    if (!verificationCase) throw new Error("Could not create verification case");

    const graphMetadata = {
      ...passportMetadata,
      verification_case_id: verificationCase.id,
    };

    await insertSignal(supabase, "Verification started", graphMetadata);
    await insertSignal(supabase, "Review requested", graphMetadata);

    if (linkedInEvidence.linkedin_url) {
      await insertSignal(supabase, "LinkedIn profile submitted", graphMetadata);
      await insertSignal(
        supabase,
        "LinkedIn profile consistency check required",
        graphMetadata
      );

      await bestEffort("Passport LinkedIn audit", async () => {
        await insertAuditLog(supabase, {
          event_type: "linkedin_profile_submitted",
          actor: userEmail || "anonymous",
          metadata: {
            ...graphMetadata,
            subject_name: subjectName,
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

    await bestEffort("Passport verification audit", async () => {
      await insertAuditLog(supabase, {
        event_type: "verification_created",
        actor: userEmail || "anonymous",
        metadata: {
          ...graphMetadata,
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
      });
    });

    await recordTrustEvent(supabase, {
      signal: `Reality Passport created for ${subjectName}`,
      audit: {
        eventType: "reality_passport_created",
        actor: userEmail || "anonymous",
        metadata: {
          ...graphMetadata,
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
        metadata: { ...graphMetadata, source: "passport.created" },
      },
    });

    await insertSignal(
      supabase,
      `Human Presence Index calculated for ${subjectName}: ${humanPresenceIndex}`,
      {
        ...graphMetadata,
        human_presence_index: humanPresenceIndex,
      }
    );

    await insertSignal(
      supabase,
      `Origin Trace generated for ${subjectName} with attribution confidence ${attributionConfidence}%`,
      {
        ...graphMetadata,
        attribution_confidence: attributionConfidence,
        origin_trace_score: originTraceScore,
      }
    );

    if (metadataIntegrity === "stripped") {
      await insertSignal(supabase, "Metadata stripped", graphMetadata);
    }

    if (watermarkStatus === "not_found") {
      await insertSignal(supabase, "Watermark not found", graphMetadata);
    }

    if (humanReviewRequired) {
      await insertSignal(supabase, "Human review required", graphMetadata);
    }

    await bestEffort("Passport audit logs", async () => {
      await insertAuditLog(supabase, {
        event_type: "passport.created",
        actor: userEmail || "anonymous",
        metadata: {
          ...graphMetadata,
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
      });

      await insertAuditLog(supabase, {
        event_type: "human_presence_index_created",
        actor: userEmail || "anonymous",
        metadata: {
          ...graphMetadata,
          subject_name: subjectName,
          human_presence_index: humanPresenceIndex,
          biometric_confidence: biometricConfidence,
          behavioural_consistency: behaviouralConsistency,
          trust_timeline_score: trustTimelineScore,
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
      });

      await insertAuditLog(supabase, {
        event_type: "origin_trace_created",
        actor: userEmail || "anonymous",
        metadata: {
          ...graphMetadata,
          subject_name: subjectName,
          attribution_confidence: attributionConfidence,
          likely_source_type: likelySourceType,
          model_fingerprint_risk: modelFingerprintRisk,
          origin_trace_score: originTraceScore,
          ...requestRisk,
        },
        created_at: new Date().toISOString(),
      });
    });

    if (humanReviewRequired) {
      await bestEffort("Passport attribution audit", async () => {
        await insertAuditLog(supabase, {
          event_type: "attribution_review_required",
          actor: userEmail || "anonymous",
          metadata: {
            ...graphMetadata,
            subject_name: subjectName,
            attribution_confidence: attributionConfidence,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
        });
      });
    }

    if (provenanceStatus === "missing" || c2paStatus === "missing") {
      await bestEffort("Passport provenance audit", async () => {
        await insertAuditLog(supabase, {
          event_type: "provenance_missing",
          actor: userEmail || "anonymous",
          metadata: {
            ...graphMetadata,
            subject_name: subjectName,
            c2pa_status: c2paStatus,
            ...requestRisk,
          },
          created_at: new Date().toISOString(),
        });
      });
    }

    if (watermarkStatus === "not_found") {
      await bestEffort("Passport watermark audit", async () => {
        await insertAuditLog(supabase, {
          event_type: "watermark_not_found",
          actor: userEmail || "anonymous",
          metadata: { ...graphMetadata, subject_name: subjectName, ...requestRisk },
          created_at: new Date().toISOString(),
        });
      });
    }

    return NextResponse.redirect(new URL("/passport?created=1", req.url), {
      status: 303,
    });
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
      getPassportErrorResponse(error),
      { status: 500 }
    );
  }
}
