import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTrustPosture } from "@/lib/trust-posture/posture";
import type { ATSWebhookEvent } from "@/lib/integrations/ats/types";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function appOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "";
  if (!configured) return "";
  const value = configured.startsWith("http") ? configured : `https://${configured}`;
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

async function findCandidate(supabase: SupabaseClient, event: ATSWebhookEvent) {
  const externalId =
    event.candidate?.externalId ?? event.interview?.candidateExternalId;
  if (!externalId) return null;
  const { data } = await supabase
    .from("candidate_profiles")
    .select("id,full_name,email,verification_status,risk_level,metadata")
    .contains("metadata", {
      ats_provider: event.provider,
      ats_candidate_id: externalId,
    })
    .limit(1)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

async function ensureCandidate(supabase: SupabaseClient, event: ATSWebhookEvent) {
  const candidate = event.candidate;
  if (!candidate?.externalId || !candidate.name || !candidate.email) {
    throw new Error("Candidate ID, name and email are required for this ATS event.");
  }

  const existing = await findCandidate(supabase, event);
  const metadata = {
    ...(existing?.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as Record<string, unknown>)
      : {}),
    ats_provider: event.provider,
    ats_candidate_id: candidate.externalId,
    ats_job_id: candidate.jobId ?? null,
    ats_last_event_id: event.eventId,
    ats_last_event_type: event.eventType,
    ats_last_event_at: event.occurredAt,
  };
  const values = {
    full_name: candidate.name,
    email: candidate.email,
    role_applied_for: candidate.jobTitle ?? null,
    metadata,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("candidate_profiles")
      .update(values)
      .eq("id", existing.id)
      .select("id,full_name,email,verification_status,risk_level")
      .single();
    if (error) throw error;
    return data as Row;
  }

  const { data, error } = await supabase
    .from("candidate_profiles")
    .insert({
      ...values,
      verification_status: "pending",
      risk_level: "pending",
    })
    .select("id,full_name,email,verification_status,risk_level")
    .single();
  if (error) throw error;
  return data as Row;
}

async function ensureSession(
  supabase: SupabaseClient,
  event: ATSWebhookEvent,
  candidate: Row | null
) {
  const interview = event.interview;
  if (!interview?.externalId) return null;

  const { data: existing } = await supabase
    .from("interview_sessions")
    .select("id,title,status,scheduled_at,metadata")
    .contains("metadata", {
      ats_provider: event.provider,
      ats_interview_id: interview.externalId,
    })
    .limit(1)
    .maybeSingle();
  const status =
    event.eventType === "interview.completed" ? "completed" : "scheduled";
  const values = {
    candidate_profile_id: candidate?.id ?? null,
    title: interview.title ?? "ATS interview workflow",
    status,
    scheduled_at: interview.scheduledAt ?? null,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {}),
      ats_provider: event.provider,
      ats_interview_id: interview.externalId,
      ats_candidate_id: interview.candidateExternalId,
      ats_last_event_id: event.eventId,
      ats_last_event_type: event.eventType,
      ats_last_event_at: event.occurredAt,
    },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("interview_sessions")
      .update(values)
      .eq("id", existing.id)
      .select("id,title,status,scheduled_at")
      .single();
    if (error) throw error;
    return data as Row;
  }

  const { data, error } = await supabase
    .from("interview_sessions")
    .insert(values)
    .select("id,title,status,scheduled_at")
    .single();
  if (error) throw error;
  return data as Row;
}

async function currentLinks(
  supabase: SupabaseClient,
  references: string[]
) {
  if (!references.length) return { replay: null, receipt: null, governance: [] as Row[] };

  const [replayResult, receiptResult, governanceResult] = await Promise.all([
    supabase
      .from("trust_replay_sessions")
      .select("id,subject_id,replay_summary,created_at")
      .in("subject_id", references)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("verification_receipts")
      .select("id,subject_id,verification_status,receipt_summary,issued_at")
      .in("subject_id", references)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("governance_actions")
      .select("id,subject_id,action_status,created_at")
      .in("subject_id", references)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    replay: (replayResult.data as Row | null) ?? null,
    receipt: (receiptResult.data as Row | null) ?? null,
    governance: (governanceResult.data ?? []) as Row[],
  };
}

export async function processATSWebhookEvent(
  supabase: SupabaseClient,
  event: ATSWebhookEvent
) {
  const { data: duplicate } = await supabase
    .from("audit_logs")
    .select("id,metadata")
    .eq("event_type", "ats_webhook_processed")
    .contains("metadata", {
      ats_provider: event.provider,
      ats_event_id: event.eventId,
    })
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    return {
      duplicate: true,
      eventId: event.eventId,
      message: "ATS event was already processed.",
    };
  }

  let candidate = await findCandidate(supabase, event);
  if (
    event.eventType === "candidate.created" ||
    event.eventType === "candidate.updated" ||
    event.eventType === "verification.requested"
  ) {
    candidate = await ensureCandidate(supabase, event);
  } else if (!candidate && event.candidate?.externalId) {
    candidate = await ensureCandidate(supabase, event);
  }

  const session =
    event.eventType === "interview.scheduled" ||
    event.eventType === "interview.completed"
      ? await ensureSession(supabase, event, candidate)
      : null;
  const subjectId = text(session?.id ?? candidate?.id);
  const subjectType = session ? "interview_session" : "candidate_profile";

  if (!subjectId) {
    throw new Error("ATS event could not be linked to a candidate or workflow.");
  }

  if (event.eventType === "verification.requested") {
    const { error } = await supabase.from("verification_events").insert({
      subject_type: "candidate",
      subject_id: subjectId,
      status: "pending",
      risk_level: "pending",
      notes: "Verification requested by a configured ATS webhook.",
      metadata: {
        ats_provider: event.provider,
        ats_event_id: event.eventId,
        human_review: true,
      },
    });
    if (error) throw error;
  }

  if (event.eventType === "offer.created") {
    const { error } = await supabase.from("governance_actions").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      action_status: "in_review",
      resolution_notes:
        "Offer event received from ATS. Requires governance review before relying on current trust posture.",
    });
    if (error) throw error;
  }

  const references = [text(candidate?.id), text(session?.id)].filter(Boolean);
  const links = await currentLinks(supabase, references);
  const unresolvedGovernance = links.governance.filter((row) =>
    ["pending", "in_review", "escalated"].includes(text(row.action_status))
  );
  const posture = buildTrustPosture({
    lastVerifiedAt: text(links.receipt?.issued_at) || null,
    lastGovernanceAt: text(links.governance[0]?.created_at) || null,
    evidenceCount: links.receipt ? 1 : 0,
    signalCount: event.eventType === "verification.requested" ? 1 : 0,
    unresolvedGovernanceCount: unresolvedGovernance.length,
    confidenceLabel: text(links.receipt?.verification_status) || null,
  });
  const origin = appOrigin();
  const replayId = text(links.replay?.id);
  const receiptId = text(links.receipt?.id);
  const replayUrl = replayId && origin ? `${origin}/replay/${replayId}` : null;
  const receiptUrl =
    receiptId && origin ? `${origin}/verification/receipt/${receiptId}` : null;

  const auditMetadata = {
    ats_provider: event.provider,
    ats_event_id: event.eventId,
    ats_event_type: event.eventType,
    candidate_profile_id: text(candidate?.id) || null,
    interview_session_id: text(session?.id) || null,
    trust_posture: posture.state,
    replay_reference: replayId || null,
    receipt_reference: receiptId || null,
    raw_payload_stored: false,
  };
  const { error: auditError } = await supabase.from("audit_logs").insert({
    event_type: "ats_webhook_processed",
    actor: `ats:${event.provider}`,
    metadata: auditMetadata,
    created_at: new Date().toISOString(),
  });
  if (auditError) throw auditError;

  return {
    duplicate: false,
    eventId: event.eventId,
    provider: event.provider,
    eventType: event.eventType,
    workflow: {
      candidateReference: text(candidate?.id) || null,
      sessionReference: text(session?.id) || null,
      verificationTriggered: event.eventType === "verification.requested",
      governanceEscalated: event.eventType === "offer.created",
    },
    trustPosture: posture,
    links: {
      replayReference: replayId || null,
      replayUrl,
      receiptReference: receiptId || null,
      receiptUrl,
    },
    safeguards: {
      humanReviewRemainsAuthoritative: true,
      receiptGeneratedOnlyFromRecordedEvidence: true,
      rawPayloadStored: false,
    },
  };
}
