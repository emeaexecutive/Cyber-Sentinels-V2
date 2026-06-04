import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const DEMO_ACTOR = "demo-lab";

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

function createDemoClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Demo seed Supabase service configuration missing.", {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseUrl),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceRoleKey),
    });
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST() {
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Demo data seeding is disabled. Set ENABLE_DEMO_SEED=true only in local or private beta environments.",
      },
      { status: 403 },
    );
  }

  const supabase = createDemoClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Demo seed service is not configured." },
      { status: 503 },
    );
  }

  try {
    const { data: passports, error: passportsError } = await supabase
      .from("passports")
      .insert([
        {
          user_email: "demo@cybersentinels.local",
          subject_name: "Keith Speres",
          subject_type: "human",
          media_type: "video",
          human_presence_index: 91,
          biometric_confidence: 94,
          behavioural_consistency: 88,
          trust_timeline_score: 86,
          synthetic_risk: 8,
          liveness_score: 95,
          voice_clone_risk: 6,
          video_deepfake_risk: 7,
          image_authenticity_score: 93,
          origin_trace_score: 89,
          attribution_confidence: 84,
          likely_source_type: "verified_human",
          model_fingerprint_risk: 5,
          metadata_integrity: "intact",
          watermark_status: "found",
          c2pa_status: "verified",
          upload_chain_status: "intact",
          human_review_required: false,
          provenance_status: "verified",
          review_status: "verified",
          verification_status: "verified",
          reality_passport_status: "verified",
          trust_score: 92,
          clearance: "verified",
          verified: true,
          scan_status: "verified",
          allowed_file_type: "video",
        },
        {
          user_email: "demo@cybersentinels.local",
          subject_name: "Orion Research Agent",
          subject_type: "agent",
          media_type: "document",
          human_presence_index: 64,
          biometric_confidence: 50,
          behavioural_consistency: 82,
          trust_timeline_score: 77,
          synthetic_risk: 28,
          liveness_score: 50,
          voice_clone_risk: 12,
          video_deepfake_risk: 10,
          image_authenticity_score: 88,
          origin_trace_score: 81,
          attribution_confidence: 79,
          likely_source_type: "ai_agent",
          model_fingerprint_risk: 18,
          metadata_integrity: "intact",
          watermark_status: "found",
          c2pa_status: "verified",
          upload_chain_status: "intact",
          human_review_required: false,
          provenance_status: "verified",
          review_status: "verified",
          verification_status: "verified",
          reality_passport_status: "verified",
          trust_score: 83,
          clearance: "agent_verified",
          verified: true,
          scan_status: "verified",
          allowed_file_type: "document",
        },
      ])
      .select("id, subject_name");

    if (passportsError) {
      throw passportsError;
    }

    const keithPassport = passports?.find(
      (passport) => passport.subject_name === "Keith Speres",
    );

    const { data: trustReport, error: trustReportError } = await supabase
      .from("trust_reports")
      .insert({
        candidate_name: "Demo Candidate",
        media_type: "video",
        human_presence_index: 78,
        biometric_confidence: 82,
        behavioural_consistency: 76,
        trust_timeline_score: 72,
        profile_consistency: 80,
        synthetic_risk: 18,
        liveness_score: 84,
        voice_clone_risk: 11,
        video_deepfake_risk: 16,
        image_authenticity_score: 81,
        origin_trace_score: 74,
        attribution_confidence: 70,
        likely_source_type: "candidate",
        model_fingerprint_risk: 19,
        metadata_integrity: "intact",
        watermark_status: "unknown",
        c2pa_status: "unverified",
        upload_chain_status: "intact",
        human_review_required: true,
        provenance_status: "unverified",
        review_status: "pending",
        confidence: 82,
        trust_score: 79,
        report_type: "candidate",
        scan_status: "pending",
        allowed_file_type: "video",
      })
      .select("id")
      .single();

    if (trustReportError) {
      throw trustReportError;
    }

    const { data: verificationCase, error: verificationCaseError } =
      await supabase
        .from("verification_cases")
        .insert({
          passport_id: keithPassport?.id ?? null,
          subject_type: "human",
          subject_name: "Keith Speres",
          status: "pending",
          verification_status: "pending",
          decision_type: "manual_review",
          human_presence_index: 91,
          origin_trace_score: 89,
          trust_score: 92,
        })
        .select("id")
        .single();

    if (verificationCaseError) {
      throw verificationCaseError;
    }

    const { error: evidenceError } = await supabase
      .from("evidence_files")
      .insert({
        verification_case_id: verificationCase.id,
        file_name: "demo-keith-speres-video-placeholder.mp4",
        file_url: "demo://evidence/keith-speres-video-placeholder",
        media_type: "video",
        scan_status: "pending",
      });

    if (evidenceError) {
      throw evidenceError;
    }

    const { error: riskScoreError } = await supabase.from("risk_scores").insert({
      verification_case_id: verificationCase.id,
      score: 42,
      risk_level: "medium",
    });

    if (riskScoreError) {
      throw riskScoreError;
    }

    const { error: signalsError } = await supabase.from("signals").insert([
      { event: "Human Presence Index calculated" },
      { event: "Origin Trace generated" },
      { event: "Trust Passport created" },
      { event: "Manual review requested" },
      { event: "Reality Passport updated" },
    ]);

    if (signalsError) {
      throw signalsError;
    }

    const metadata = {
      source: "demo_lab",
      trust_passport_id: keithPassport?.id ?? null,
      trust_report_id: trustReport.id,
      verification_case_id: verificationCase.id,
      verification_case_status: "pending",
      risk_level: "medium",
      demo_records: {
        trust_passport: { subject: "Keith Speres", type: "verified_human" },
        ai_agent_passport: {
          subject: "Orion Research Agent",
          type: "ai_agent",
        },
        candidate_trust_report: {
          subject: "Demo Candidate",
          type: "candidate",
        },
      },
    };

    await bestEffort("Demo seed audit logs", async () => {
      const createdAt = new Date().toISOString();
      const { error: auditError } = await supabase.from("audit_logs").insert([
        { event_type: "passport_created", actor: DEMO_ACTOR, metadata, created_at: createdAt },
        { event_type: "hpi_created", actor: DEMO_ACTOR, metadata, created_at: createdAt },
        { event_type: "origin_trace_created", actor: DEMO_ACTOR, metadata, created_at: createdAt },
        { event_type: "trust_report_created", actor: DEMO_ACTOR, metadata, created_at: createdAt },
        { event_type: "manual_review_requested", actor: DEMO_ACTOR, metadata, created_at: createdAt },
      ]);

      if (auditError) {
        throw auditError;
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Demo data seeded.",
      records: {
        passports: passports?.length ?? 0,
        trust_reports: 1,
        signals: 5,
        audit_logs: 5,
        verification_cases: 1,
        evidence_files: 1,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not seed demo data." },
      { status: 500 },
    );
  }
}
