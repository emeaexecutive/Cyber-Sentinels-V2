import type { SupabaseClient, User } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

export const fakeActorActions = [
  "block",
  "remove",
  "report",
  "false_positive",
  "escalate",
] as const;

export type FakeActorAction = (typeof fakeActorActions)[number];

export type FakeActorStatus =
  | "under_review"
  | "blocked"
  | "removed_from_workflow"
  | "false_positive"
  | "governance_escalated";

export const fakeActorStatusLabels: Record<FakeActorStatus, string> = {
  under_review: "Under Review",
  blocked: "Blocked",
  removed_from_workflow: "Removed From Workflow",
  false_positive: "False Positive",
  governance_escalated: "Governance Escalated",
};

export type ProviderSignalSummary = {
  id: string;
  category: string;
  state: string;
  risk: string;
  confidence: number | null;
  summary: string;
  createdAt: string | null;
};

export type FakeActorRecord = {
  id: string;
  subjectType: "candidate_profile" | "interview_session";
  displayName: string;
  privateContact: string | null;
  workflowId: string | null;
  workflowTitle: string;
  actorStatus: FakeActorStatus;
  actorStatusLabel: string;
  riskLevel: string;
  syntheticRisk: string;
  verificationState: string;
  governanceStatus: string;
  evidencePreserved: boolean;
  reviewerNote: string | null;
  lastAdminActor: string | null;
  lastActionAt: string | null;
  sessionIntegrity: {
    state: string;
    manualReviewRequired: boolean;
    summary: string;
  };
  providerSignals: ProviderSignalSummary[];
  replay: { id: string; summary: string } | null;
  receipt: { id: string; summary: string; status: string } | null;
  evidenceCounts: {
    signals: number;
    sessionChecks: number;
    replayRecords: number;
    receipts: number;
  };
};

const enforcementEvents = [
  "fake_actor_blocked",
  "fake_actor_removed",
  "fake_actor_reported",
  "fake_actor_false_positive",
  "fake_actor_governance_escalated",
];

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uuid(value: unknown) {
  return text(value);
}

function metadata(row: Row) {
  return row.metadata && typeof row.metadata === "object"
    ? (row.metadata as Record<string, unknown>)
    : {};
}

async function readRows(
  supabase: SupabaseClient,
  table: string,
  select: string,
  limit = 250,
  orderColumn = "created_at"
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`Fake actor review could not read ${table}.`, error.message);
    return [] as Row[];
  }

  return (data ?? []) as unknown as Row[];
}

function eventStatus(eventType: string): FakeActorStatus {
  if (eventType === "fake_actor_blocked") return "blocked";
  if (eventType === "fake_actor_removed") return "removed_from_workflow";
  if (eventType === "fake_actor_false_positive") return "false_positive";
  if (eventType === "fake_actor_governance_escalated") return "governance_escalated";
  return "under_review";
}

function hasReviewRisk(value: unknown) {
  const normalized = text(value).toLowerCase();
  return [
    "high",
    "critical",
    "elevated",
    "failed",
    "flagged",
    "suspicious",
    "needs_review",
    "manual_review",
    "rejected",
  ].some((marker) => normalized.includes(marker));
}

function signalSummary(row: Row): ProviderSignalSummary {
  return {
    id: uuid(row.id),
    category: text(row.category, "provider_verification"),
    state: text(row.signal_status, "recorded"),
    risk: text(row.risk_level, "unknown"),
    confidence:
      typeof row.confidence_score === "number" ? row.confidence_score : null,
    summary: text(row.explanation, "Provider-backed signal retained for review."),
    createdAt: text(row.created_at) || null,
  };
}

function latestForSubject(rows: Row[], subjectIds: string[]) {
  return rows.find((row) => {
    const meta = metadata(row);
    return subjectIds.includes(uuid(meta.actor_id ?? meta.subject_id));
  });
}

export async function loadFakeActorQueue(
  supabase: SupabaseClient
): Promise<FakeActorRecord[]> {
  const [
    candidates,
    sessions,
    checks,
    signals,
    replays,
    receipts,
    governance,
    auditEvents,
  ] = await Promise.all([
    readRows(
      supabase,
      "candidate_profiles",
      "id,full_name,email,verification_status,risk_level,notes,created_at"
    ),
    readRows(
      supabase,
      "interview_sessions",
      "id,candidate_profile_id,title,status,created_at"
    ),
    readRows(
      supabase,
      "session_integrity_checks",
      "id,interview_session_id,overall_status,manual_review_required,review_summary,created_at"
    ),
    readRows(
      supabase,
      "verification_signals",
      "id,interview_session_id,category,signal_status,risk_level,confidence_score,explanation,badge_label,requires_manual_review,created_at",
      500
    ),
    readRows(
      supabase,
      "trust_replay_sessions",
      "id,subject_type,subject_id,replay_summary,created_at"
    ),
    readRows(
      supabase,
      "verification_receipts",
      "id,subject_type,subject_id,verification_status,receipt_summary,issued_at",
      250,
      "issued_at"
    ),
    readRows(
      supabase,
      "governance_actions",
      "id,subject_type,subject_id,action_status,resolution_notes,assigned_to,created_at"
    ),
    readRows(
      supabase,
      "audit_logs",
      "id,event_type,actor,metadata,created_at",
      500
    ),
  ]);

  const enforcementAudit = auditEvents.filter((row) =>
    enforcementEvents.includes(text(row.event_type))
  );
  const queue: FakeActorRecord[] = [];
  const linkedSessionIds = new Set<string>();

  const buildRecord = (
    subject: Row,
    subjectType: FakeActorRecord["subjectType"],
    relatedSessions: Row[]
  ) => {
    const subjectId = uuid(subject.id);
    const sessionIds = relatedSessions.map((row) => uuid(row.id)).filter(Boolean);
    const referenceIds = [subjectId, ...sessionIds];
    const relatedSignals = signals.filter((row) =>
      sessionIds.includes(uuid(row.interview_session_id))
    );
    const relatedChecks = checks.filter((row) =>
      sessionIds.includes(uuid(row.interview_session_id))
    );
    const latestCheck = relatedChecks[0];
    const latestAudit = latestForSubject(enforcementAudit, referenceIds);
    const latestGovernance = governance.find((row) =>
      referenceIds.includes(uuid(row.subject_id))
    );
    const replay = replays.find((row) =>
      referenceIds.includes(uuid(row.subject_id))
    );
    const receipt = receipts.find((row) =>
      referenceIds.includes(uuid(row.subject_id))
    );
    const auditMeta = latestAudit ? metadata(latestAudit) : {};
    const ownRisk = text(subject.risk_level ?? subject.status, "under_review");
    const highestSignal = relatedSignals.find(
      (row) => text(row.risk_level).toLowerCase() === "high"
    );
    const actorStatus = latestAudit
      ? eventStatus(text(latestAudit.event_type))
      : latestGovernance?.action_status === "escalated"
        ? "governance_escalated"
        : "under_review";

    const record: FakeActorRecord = {
      id: subjectId,
      subjectType,
      displayName:
        subjectType === "candidate_profile"
          ? text(subject.full_name, "Candidate under review")
          : text(subject.title, "Unlinked session under review"),
      privateContact:
        subjectType === "candidate_profile" ? text(subject.email) || null : null,
      workflowId: sessionIds[0] ?? (subjectType === "interview_session" ? subjectId : null),
      workflowTitle: text(relatedSessions[0]?.title, "Verification workflow"),
      actorStatus,
      actorStatusLabel: fakeActorStatusLabels[actorStatus],
      riskLevel: text(highestSignal?.risk_level, ownRisk),
      syntheticRisk: highestSignal
        ? "Based on available evidence"
        : "Requires governance review",
      verificationState: text(
        subject.verification_status ?? subject.status,
        "under_review"
      ),
      governanceStatus: text(
        latestGovernance?.action_status,
        "review_required"
      ),
      evidencePreserved: Boolean(
        auditMeta.evidence_preserved ?? replay ?? receipt ?? relatedSignals.length
      ),
      reviewerNote:
        text(auditMeta.reviewer_note ?? latestGovernance?.resolution_notes) || null,
      lastAdminActor: text(latestAudit?.actor) || null,
      lastActionAt: text(latestAudit?.created_at) || null,
      sessionIntegrity: {
        state: text(latestCheck?.overall_status, "not_recorded"),
        manualReviewRequired: Boolean(
          latestCheck?.manual_review_required ??
            relatedSignals.some((row) => row.requires_manual_review === true)
        ),
        summary: text(
          latestCheck?.review_summary,
          relatedChecks.length
            ? "Session evidence retained for review."
            : "No session integrity review recorded."
        ),
      },
      providerSignals: relatedSignals.slice(0, 12).map(signalSummary),
      replay: replay
        ? {
            id: uuid(replay.id),
            summary: text(replay.replay_summary, "Replay chronology available."),
          }
        : null,
      receipt: receipt
        ? {
            id: uuid(receipt.id),
            summary: text(receipt.receipt_summary, "Verification receipt available."),
            status: text(receipt.verification_status, "recorded"),
          }
        : null,
      evidenceCounts: {
        signals: relatedSignals.length,
        sessionChecks: relatedChecks.length,
        replayRecords: replays.filter((row) =>
          referenceIds.includes(uuid(row.subject_id))
        ).length,
        receipts: receipts.filter((row) =>
          referenceIds.includes(uuid(row.subject_id))
        ).length,
      },
    };

    const flagged =
      hasReviewRisk(ownRisk) ||
      relatedSignals.some(
        (row) =>
          hasReviewRisk(row.risk_level) ||
          hasReviewRisk(row.signal_status) ||
          row.requires_manual_review === true
      ) ||
      relatedChecks.some(
        (row) =>
          row.manual_review_required === true || hasReviewRisk(row.overall_status)
      ) ||
      Boolean(latestAudit) ||
      Boolean(latestGovernance);

    return flagged ? record : null;
  };

  for (const candidate of candidates) {
    const candidateId = uuid(candidate.id);
    const relatedSessions = sessions.filter(
      (row) => uuid(row.candidate_profile_id) === candidateId
    );
    relatedSessions.forEach((row) => linkedSessionIds.add(uuid(row.id)));
    const record = buildRecord(candidate, "candidate_profile", relatedSessions);
    if (record) queue.push(record);
  }

  for (const session of sessions) {
    const sessionId = uuid(session.id);
    if (linkedSessionIds.has(sessionId)) continue;
    const record = buildRecord(session, "interview_session", [session]);
    if (record) queue.push(record);
  }

  return queue.sort((a, b) => {
    const priority = (record: FakeActorRecord) =>
      record.actorStatus === "under_review" ||
      record.actorStatus === "governance_escalated"
        ? 0
        : 1;
    return priority(a) - priority(b);
  });
}

export async function loadFakeActor(
  supabase: SupabaseClient,
  id: string
) {
  const queue = await loadFakeActorQueue(supabase);
  return queue.find((record) => record.id === id || record.workflowId === id) ?? null;
}

const actionConfiguration: Record<
  FakeActorAction,
  {
    eventType: string;
    status: FakeActorStatus;
    governanceStatus: string;
    candidateState: string;
    sessionState: string;
    riskLevel: string;
  }
> = {
  block: {
    eventType: "fake_actor_blocked",
    status: "blocked",
    governanceStatus: "resolved",
    candidateState: "blocked",
    sessionState: "blocked",
    riskLevel: "high",
  },
  remove: {
    eventType: "fake_actor_removed",
    status: "removed_from_workflow",
    governanceStatus: "resolved",
    candidateState: "removed_from_workflow",
    sessionState: "removed_from_workflow",
    riskLevel: "high",
  },
  report: {
    eventType: "fake_actor_reported",
    status: "under_review",
    governanceStatus: "in_review",
    candidateState: "under_review",
    sessionState: "under_review",
    riskLevel: "high",
  },
  false_positive: {
    eventType: "fake_actor_false_positive",
    status: "false_positive",
    governanceStatus: "resolved",
    candidateState: "reviewed",
    sessionState: "reviewed",
    riskLevel: "low",
  },
  escalate: {
    eventType: "fake_actor_governance_escalated",
    status: "governance_escalated",
    governanceStatus: "escalated",
    candidateState: "under_review",
    sessionState: "under_review",
    riskLevel: "high",
  },
};

export async function enforceFakeActorAction(
  supabase: SupabaseClient,
  user: User,
  actor: FakeActorRecord,
  action: FakeActorAction,
  reviewerNote: string
) {
  const configuration = actionConfiguration[action];
  const now = new Date().toISOString();
  const adminActor = user.email ?? user.id;
  const note =
    reviewerNote.trim() ||
    `${fakeActorStatusLabels[configuration.status]} based on available evidence.`;
  const evidenceSnapshot = {
    actor_id: actor.id,
    subject_type: actor.subjectType,
    workflow_id: actor.workflowId,
    replay_id: actor.replay?.id ?? null,
    receipt_id: actor.receipt?.id ?? null,
    provider_signal_summaries: actor.providerSignals.map((signal) => ({
      category: signal.category,
      state: signal.state,
      risk: signal.risk,
      summary: signal.summary,
    })),
    session_integrity: actor.sessionIntegrity,
    evidence_counts: actor.evidenceCounts,
  };

  const audit = await supabase.from("audit_logs").insert({
    event_type: configuration.eventType,
    actor: adminActor,
    metadata: {
      ...evidenceSnapshot,
      enforcement_status: configuration.status,
      reviewer_note: note,
      evidence_preserved: true,
      admin_actor: adminActor,
      action_timestamp: now,
      previous_state: {
        actor_status: actor.actorStatus,
        verification_state: actor.verificationState,
        governance_status: actor.governanceStatus,
      },
    },
    created_at: now,
  });
  if (audit.error) throw new Error("The enforcement audit event could not be written.");

  const governance = await supabase
    .from("governance_actions")
    .insert({
      subject_type: actor.subjectType,
      subject_id: actor.id,
      action_status: configuration.governanceStatus,
      assigned_to: user.id,
      resolution_notes: note,
      resolved_at:
        configuration.governanceStatus === "resolved" ? now : null,
    })
    .select("id")
    .single();
  if (governance.error) {
    throw new Error("The governance event could not be created.");
  }

  const sourceUpdate =
    actor.subjectType === "candidate_profile"
      ? await supabase
          .from("candidate_profiles")
          .update({
            verification_status: configuration.candidateState,
            risk_level: configuration.riskLevel,
            notes: note,
            updated_at: now,
          })
          .eq("id", actor.id)
      : await supabase
          .from("interview_sessions")
          .update({
            status: configuration.sessionState,
            updated_at: now,
          })
          .eq("id", actor.id);

  if (sourceUpdate.error) {
    throw new Error("The workflow trust state could not be updated.");
  }

  return {
    actorId: actor.id,
    status: configuration.status,
    statusLabel: fakeActorStatusLabels[configuration.status],
    evidencePreserved: true,
    governanceEventId: uuid(governance.data?.id),
    actionTimestamp: now,
    adminActor,
  };
}

export function safeEvidenceExport(actor: FakeActorRecord) {
  return {
    generatedAt: new Date().toISOString(),
    subjectReference: actor.id,
    subjectType: actor.subjectType,
    workflowReference: actor.workflowId,
    status: actor.actorStatusLabel,
    legalQualifier: "Based on available evidence; requires accountable governance review.",
    evidencePreserved: actor.evidencePreserved,
    verificationState: actor.verificationState,
    governanceStatus: actor.governanceStatus,
    sessionIntegrity: actor.sessionIntegrity,
    providerEvidenceSummary: actor.providerSignals,
    replayReference: actor.replay?.id ?? null,
    receiptReference: actor.receipt?.id ?? null,
    reviewerNote: actor.reviewerNote,
    evidenceCounts: actor.evidenceCounts,
    excluded: [
      "raw provider output",
      "provider secrets",
      "identity documents",
      "credentials",
    ],
  };
}
