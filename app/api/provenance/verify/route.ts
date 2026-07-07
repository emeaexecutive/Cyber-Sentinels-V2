import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provenanceTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { createReceiptBundle } from "@/lib/trust-receipts/receipts";
import { evaluateProvenanceConfidence } from "@/lib/trust/provenance-confidence";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

async function handleProvenanceVerification(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const mediaLabel = text(formData, "media_label");
  const factors = provenanceTrustFactors();
  const trustScore = trustScoreFromFactors(factors);
  const provenanceConfidence = evaluateProvenanceConfidence({
    c2pa: "placeholder",
    synthId: "placeholder",
    aiDisclosure: text(formData, "ai_disclosure") === "declared" ? "declared" : "unknown",
    evidenceTimelineCount: factors.length,
  });
  const orchestrationStatus = trustScore >= 70 ? "review_ready" : "needs_governance_review";
  const reportId = crypto.randomUUID();
  const actor = user.email ?? user.id;
  const metadata = {
    report_id: reportId,
    media_label: mediaLabel,
    source_url: text(formData, "source_url"),
    media_type: text(formData, "media_type") || "image",
    factors,
    provenance_confidence: provenanceConfidence,
    source: "api.provenance.verify",
    orchestration_status: orchestrationStatus,
    warning:
      "Detection and provenance are signals. Trust requires evidence, timeline, governance and human review.",
  };

  await createAuditLog(supabase, "provenance_verification_requested", actor, metadata);
  await createSignal(supabase, "Provenance verification requested", metadata);

  await bestEffort("provenance governance action insert", async () => {
    await supabase.from("governance_actions").insert({
      subject_type: "media",
      subject_id: reportId,
      action_status: trustScore >= 70 ? "pending" : "in_review",
      resolution_notes:
        "Provenance review created. Human review should inspect source URL, metadata, watermark, evidence chain, timeline context and governance state before relying on this workflow.",
    });
  });

  await bestEffort("provenance trust case insert", async () => {
    await supabase.from("trust_cases").insert({
      title: `Provenance review: ${mediaLabel || reportId}`,
      description:
        `Media provenance, evidence chain, signals and governance state require review. Report ID: ${reportId}.`,
      status: trustScore >= 70 ? "open" : "in_review",
      priority: trustScore >= 70 ? "medium" : "high",
      created_by: user.id,
    });
  });

  await bestEffort("provenance receipt bundle insert", async () => {
    await createReceiptBundle(supabase, {
      subjectType: "media",
      subjectId: reportId,
      receiptType: trustScore >= 70 ? "media_provenance_review_ready" : "media_provenance_needs_review",
      verificationStatus: orchestrationStatus,
      confidenceLevel: trustScore >= 70 ? "High Trust" : "In Review",
      issuedBy: user.id,
      receiptSummary:
        "Media provenance review was recorded with source, metadata, watermark and upload-chain context. This receipt explains signals and does not prove authenticity by itself.",
      chainSummary:
        "Provenance evidence chain links media review metadata, trust factors, audit activity, signals, timelines and governance review.",
      evidenceSnapshot: {
        report_id: reportId,
        media_label: mediaLabel,
        source_url: metadata.source_url,
        media_type: metadata.media_type,
        trust_score: trustScore,
        orchestration_status: orchestrationStatus,
        missing_signal_policy:
          "Missing provenance or detection context should create a warning, not an authenticity assertion.",
        provenance_confidence: provenanceConfidence,
        human_review: true,
      },
      evidence: [
        { type: "media_review", id: reportId, status: orchestrationStatus },
        { type: "trust_factors", factors },
        { type: "audit_log", event_type: "provenance_verification_requested" },
        { type: "signal", event: "Provenance verification requested" },
      ],
    });
  });

  await bestEffort("provenance replay insert", async () => {
    await supabase.from("trust_replay_sessions").insert({
      subject_type: "media",
      subject_id: reportId,
      replay_summary:
        "Initial media replay captures provenance review request, trust factors, audit logging, signal generation, timeline context and pending human governance review.",
      generated_by: "api.provenance.verify",
    });
  });

  return NextResponse.json({
    ok: true,
    report_id: reportId,
    media_url: `/trust/media/${encodeURIComponent(reportId)}`,
    trust_score: trustScore,
    orchestration_status: orchestrationStatus,
    warning:
      "Detection and provenance are signals. Trust requires orchestration through evidence, governance, timeline and human review.",
    factors,
    provenance_confidence: provenanceConfidence,
  });
}

export async function POST(req: Request) {
  try {
    return await handleProvenanceVerification(req);
  } catch (error) {
    console.error("provenance verification route failed", error);

    return NextResponse.json(
      { ok: false, error: "Provenance verification is temporarily unavailable" },
      { status: 503 }
    );
  }
}
