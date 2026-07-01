import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { candidateTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";
import {
  createReceiptBundle,
  receiptConfidence,
  verificationReceiptType,
} from "@/lib/trust-receipts/receipts";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

type CandidateInput = FormData | Record<string, unknown>;

function text(input: CandidateInput, name: string) {
  const value = input instanceof FormData ? input.get(name) : input[name];
  return String(value ?? "").trim();
}

async function readInput(req: Request): Promise<CandidateInput> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  }
  return req.formData();
}

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}

async function handleCandidateVerification(req: Request) {
  const wantsRedirect = !(req.headers.get("content-type") ?? "").includes("application/json");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return wantsRedirect
      ? redirectTo(req, "/login?next=/verify/candidate")
      : NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const input = await readInput(req);
  const candidateName = text(input, "full_name") || text(input, "candidate_name");
  const email = text(input, "email") || text(input, "candidate_email");
  const roleAppliedFor = text(input, "role_applied_for") || text(input, "role");
  const companyName = text(input, "company_name");
  const requestedStatus = text(input, "verification_status") || "pending";
  const verificationStatus = ["pending", "needs_manual_review"].includes(requestedStatus)
    ? requestedStatus
    : "needs_manual_review";
  const provenanceStatus = text(input, "provenance_status") || "unknown";
  const requestedRisk = text(input, "risk_level") || "pending";
  const riskLevel = ["pending", "low", "moderate", "needs_review", "high"].includes(requestedRisk)
    ? requestedRisk
    : "needs_review";
  const notes = text(input, "notes");

  if (!candidateName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return wantsRedirect
      ? redirectTo(req, "/verify/candidate?error=missing_fields")
      : NextResponse.json({ ok: false, error: "Candidate name and a valid email are required" }, { status: 400 });
  }

  const factors = candidateTrustFactors();
  const trustScore = trustScoreFromFactors(factors);
  const actor = user.email ?? user.id;
  const metadata = {
    candidate_email: email,
    role: roleAppliedFor,
    company_name: companyName,
    linkedin_url: text(input, "linkedin_url"),
    notes,
    provenance_status: provenanceStatus,
    factors,
    source: "api.candidate.verify",
  };

  const { data: candidateProfile, error: profileError } = await supabase
    .from("candidate_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: candidateName,
        email,
        role_applied_for: roleAppliedFor || null,
        company_name: companyName || null,
        verification_status: verificationStatus,
        provenance_status: provenanceStatus,
        risk_level: riskLevel,
        notes: notes || null,
        metadata,
      },
      { onConflict: "user_id,email" }
    )
    .select("id")
    .single();

  if (profileError) {
    console.error("candidate profile upsert failed", profileError);
    return wantsRedirect
      ? redirectTo(req, "/verify/candidate?error=profile_failed")
      : NextResponse.json({ ok: false, error: "candidate_profile_failed" }, { status: 500 });
  }

  const { data: report, error } = await supabase
    .from("trust_reports")
    .insert({
      owner_email: user.email ?? null,
      candidate_name: candidateName,
      report_type: "candidate",
      media_type: "video",
      trust_score: trustScore,
      confidence: trustScore,
      human_presence_index: factors[0].score,
      profile_consistency: 80,
      synthetic_risk: Math.max(0, 100 - trustScore),
      review_status: trustScore >= 70 ? "ready" : "manual_review",
      linkedin_url: metadata.linkedin_url || null,
      linkedin_claimed_role: metadata.role || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("candidate verification report insert failed", error);
  }

  const { error: eventError } = await supabase.from("verification_events").insert({
    user_id: user.id,
    subject_type: "candidate",
    subject_id: candidateProfile?.id ?? null,
    status: verificationStatus,
    risk_level: riskLevel,
    notes: notes || null,
    metadata: {
      ...metadata,
      trust_report_id: report?.id ?? null,
    },
  });

  if (eventError) {
    console.error("candidate verification event insert failed", eventError);
    return wantsRedirect
      ? redirectTo(req, "/verify/candidate?error=event_failed")
      : NextResponse.json({ ok: false, error: "candidate_event_failed" }, { status: 500 });
  }

  await createAuditLog(supabase, "candidate_verification_requested", actor, metadata);
  await createSignal(supabase, "Candidate verification requested", metadata);

  let receiptWarning = false;
  if (candidateProfile?.id) {
    const receiptResult = await createReceiptBundle(supabase, {
      subjectType: "candidate",
      subjectId: candidateProfile.id,
      receiptType: verificationReceiptType(
        "candidate_verified",
        verificationStatus,
        "candidate_verification_recorded"
      ),
      verificationStatus,
      confidenceLevel: receiptConfidence(verificationStatus, riskLevel),
      issuedBy: user.id,
      receiptSummary:
        ["verified", "approved"].includes(verificationStatus.toLowerCase())
          ? "Candidate verification was recorded with supporting provenance and operational review context."
          : "Candidate verification was recorded for human review. This receipt does not claim final candidate approval.",
      chainSummary:
        "Candidate evidence chain records profile data, provenance state, verification status, audit activity and review context.",
      evidenceSnapshot: {
        candidate_profile_id: candidateProfile.id,
        trust_report_id: report?.id ?? null,
        verification_status: verificationStatus,
        provenance_status: provenanceStatus,
        risk_level: riskLevel,
        human_review: true,
        operational_context:
          "Candidate verification receipt generated from the hiring verification workflow.",
      },
      evidence: [
        { type: "candidate_profile", id: candidateProfile.id, status: verificationStatus },
        { type: "trust_report", id: report?.id ?? null, score: trustScore },
        { type: "audit_log", event_type: "candidate_verification_requested" },
        { type: "signal", event: "Candidate verification requested" },
      ],
    });
    receiptWarning = Boolean(receiptResult.error);
  }

  if (wantsRedirect) {
    if (receiptWarning) {
      return redirectTo(req, "/verify/candidate?status=recorded&warning=receipt_unavailable");
    }
    if (!report?.id) {
      return redirectTo(req, "/verify/candidate?status=recorded&warning=report_unavailable");
    }
    return redirectTo(req, `/trust/interview-report/${report.id}`);
  }

  return NextResponse.json({
    ok: true,
    candidate_profile_id: candidateProfile?.id ?? null,
    report_id: report?.id ?? null,
    trust_score: trustScore,
    factors,
    warning: receiptWarning
      ? "verification_receipt_unavailable"
      : report?.id
        ? null
        : "trust_report_unavailable",
  });
}

export async function POST(req: Request) {
  const wantsRedirect = !(req.headers.get("content-type") ?? "").includes("application/json");
  try {
    return await handleCandidateVerification(req);
  } catch (error) {
    console.error("candidate verification route failed", error);

    return wantsRedirect
      ? redirectTo(req, "/verify/candidate?error=temporarily_unavailable")
      : NextResponse.json(
          { ok: false, error: "Candidate verification is temporarily unavailable" },
          { status: 503 }
        );
  }
}
