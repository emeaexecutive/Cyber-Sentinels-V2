import "server-only";

import { NextResponse } from "next/server";
import {
  buildWorkflowProviderSignals,
  summarizeProviderSignals,
  toNormalizedVerificationResponse,
} from "@/lib/providers";
import { buildTrustPosture, latestCreatedAt } from "@/lib/trust-posture/posture";
import { evaluateTrustAssurance } from "@/lib/trust-assurance";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, any>;

const openGovernanceStates = new Set(["pending", "in_review", "escalated"]);

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function authenticatedTrustClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: apiError("Authentication required.", 401) };
  return { supabase, user };
}

export function validReference(value: string) {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function safeProviderSummary(receipt: Row | null) {
  const signals = buildWorkflowProviderSignals({
    evidenceSnapshot: (receipt?.evidence_snapshot ?? {}) as Row,
    providerVerificationState: receipt?.verification_status,
  });
  const summary = summarizeProviderSignals(signals);

  return {
    providers: signals.map((signal) => ({
      providerId: signal.providerId,
      providerName: signal.providerName,
      verificationState: signal.providerVerificationState,
      evidenceReferences: signal.evidenceReferences,
      summary: signal.summary,
      normalizedOutput: toNormalizedVerificationResponse(signal),
    })),
    verificationState: summary.providerVerificationState,
    evidenceReferences: summary.evidenceReferences,
  };
}

export async function loadWorkflowTrust(supabase: any, subjectId: string, subjectType?: string) {
  const applySubject = (query: any) => {
    let next = query.eq("subject_id", subjectId);
    if (subjectType) next = next.eq("subject_type", subjectType);
    return next;
  };

  const [receiptsResult, timelineResult, evidenceResult, governanceResult, replayResult] =
    await Promise.all([
      applySubject(supabase.from("verification_receipts").select(
        "id,subject_type,subject_id,receipt_type,verification_status,confidence_level,issued_by,issued_at,expires_at,receipt_summary,evidence_snapshot"
      )).order("issued_at", { ascending: false }).limit(10),
      applySubject(supabase.from("trust_timeline_events").select(
        "id,subject_type,subject_id,event_type,event_title,event_summary,actor_type,actor_id,severity,created_at"
      )).order("created_at", { ascending: true }).limit(200),
      applySubject(supabase.from("evidence_chains").select(
        "id,subject_type,subject_id,chain_summary,created_at"
      )).order("created_at", { ascending: true }).limit(100),
      applySubject(supabase.from("governance_actions").select(
        "id,subject_type,subject_id,action_status,assigned_to,resolution_notes,resolved_at,created_at"
      )).order("created_at", { ascending: true }).limit(100),
      applySubject(supabase.from("trust_replay_sessions").select(
        "id,subject_type,subject_id,replay_summary,generated_by,created_at"
      )).order("created_at", { ascending: true }).limit(50),
    ]);

  const errors = [receiptsResult, timelineResult, evidenceResult, governanceResult, replayResult]
    .map((result) => result.error)
    .filter(Boolean);
  if (errors.length) throw errors[0];

  const receipts = receiptsResult.data ?? [];
  const timeline = timelineResult.data ?? [];
  const evidence = evidenceResult.data ?? [];
  const governance = governanceResult.data ?? [];
  const replay = replayResult.data ?? [];
  const currentReceipt = receipts[0] ?? null;
  const unresolved = governance.filter((row: Row) =>
    openGovernanceStates.has(String(row.action_status))
  );
  const posture = buildTrustPosture({
    lastVerifiedAt: currentReceipt?.issued_at,
    lastGovernanceAt: latestCreatedAt(governance),
    lastEvidenceAt: latestCreatedAt(evidence),
    lastSignalAt: latestCreatedAt(timeline),
    evidenceCount: evidence.length,
    signalCount: timeline.length,
    unresolvedGovernanceCount: unresolved.length,
    confidenceLabel: currentReceipt?.confidence_level,
  });
  const providerEvidence = safeProviderSummary(currentReceipt);
  const chronologyText = timeline
    .map((row: Row) => `${row.event_type ?? ""} ${row.event_title ?? ""} ${row.event_summary ?? ""}`)
    .join(" ")
    .toLowerCase();
  const governanceApproved = governance.some((row: Row) =>
    ["approved", "resolved"].includes(String(row.action_status))
  );
  const assurance = evaluateTrustAssurance({
    basicEvidence: Boolean(currentReceipt || evidence.length || timeline.length),
    sessionContinuity: /session|continuity/.test(chronologyText),
    consentRecorded: /consent/.test(chronologyText),
    providerBackedIdentity: providerEvidence.verificationState === "verified",
    governanceApproved,
    replayIntegrity: replay.length > 0 && timeline.length > 0 && evidence.length > 0,
    authorizationContinuity: governanceApproved && unresolved.length === 0,
    secureDeviceAttestation: /device_attestation|hardware_attestation|hardware-backed/.test(chronologyText),
    evidenceQuality: Number(
      currentReceipt?.evidence_snapshot?.assurance_evidence_quality ?? 0
    ),
    evidenceReferences: [
      ...providerEvidence.evidenceReferences,
      ...evidence.map((row: Row) => row.chain_summary).filter(Boolean),
    ],
  });

  return {
    workflow: {
      subjectType: currentReceipt?.subject_type ?? timeline[0]?.subject_type ?? subjectType ?? "workflow",
      subjectId,
    },
    posture,
    explanation: {
      whatChanged: timeline.at(-1)?.event_summary ?? "No trust transition is recorded.",
      why: posture.explanation,
      evidenceContribution: `${evidence.length} evidence chain record(s) and ${timeline.length} chronology event(s).`,
      governanceImpact: unresolved.length
        ? `${unresolved.length} governance action(s) remain open.`
        : "No unresolved governance action is visible.",
    },
    providerEvidence,
    assurance,
    evidenceContinuity: evidence,
    chronology: timeline,
    governanceLineage: governance,
    replay: {
      reference: replay.at(-1)?.id ? `/api/replay/${replay.at(-1).id}` : `/replay/${subjectId}`,
      sessions: replay,
      supportedEvidenceLineage: [
        "provider_verification",
        "session_integrity",
        "device_continuity",
        "behavioral_consistency",
        "biometric_continuity_reference",
        "governance_continuity",
      ],
    },
    receipts: receipts.map(({ evidence_snapshot: _hidden, ...receipt }: Row) => ({
      ...receipt,
      apiReference: `/api/receipts/${receipt.id}`,
    })),
  };
}
