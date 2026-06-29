import type {
  BenchmarkObservation,
  BenchmarkObservationKind,
  BenchmarkOutcome,
} from "@/lib/benchmarking/types";

type Row = Record<string, any>;

export type BenchmarkRecordInput = {
  providerSignals?: Row[];
  governanceActions?: Row[];
  replaySessions?: Row[];
  sessionIntegrityChecks?: Row[];
  trustEvents?: Row[];
  reviewRecords?: Row[];
  workflowRecords?: Row[];
  candidateProfiles?: Row[];
  recruiterProfiles?: Row[];
  interviewRiskEvents?: Row[];
};

function dateFor(row: Row) {
  return String(row.created_at ?? row.updated_at ?? new Date(0).toISOString());
}

function referenceFor(row: Row, fallback: string) {
  return String(
    row.evidence_reference ??
      row.provider_reference ??
      row.receipt_id ??
      row.replay_id ??
      row.id ??
      fallback
  );
}

function workflowFor(row: Row, fallback: string) {
  return String(
    row.workflow_id ??
      row.interview_session_id ??
      row.verification_case_id ??
      row.subject_id ??
      row.passport_id ??
      fallback
  );
}

function explanationFor(row: Row, fallback: string) {
  return String(
    row.explanation ??
      row.summary ??
      row.notes ??
      row.resolution_notes ??
      row.risk_reason ??
      fallback
  );
}

function statusFor(row: Row) {
  return String(
    row.verification_state ??
      row.verification_status ??
      row.overall_status ??
      row.action_status ??
      row.status ??
      row.outcome ??
      ""
  ).toLowerCase();
}

function providerOutcome(status: string): BenchmarkOutcome {
  if (/verified|success|approved|complete/.test(status)) return "observed_success";
  if (/failed|rejected|error/.test(status)) return "observed_failure";
  if (/review|escalat/.test(status)) return "review_required";
  return "pending";
}

function governanceAction(row: Row) {
  const action = String(
    row.resolution_notes ??
      row.action_type ??
      row.action_status ??
      row.decision ??
      ""
  ).trim();
  if (!action) return null;
  const reviewer = String(
    row.reviewer_name ?? row.assigned_to ?? row.reviewer_email ?? "workflow reviewer"
  );
  return `${action} by ${reviewer}`;
}

function observation(input: {
  row: Row;
  index: number;
  prefix: string;
  kind: BenchmarkObservationKind;
  outcome: BenchmarkOutcome;
  workflowType: string;
  explanation: string;
  provider?: string | null;
  governance?: string | null;
  trustDelta?: number | null;
}): BenchmarkObservation {
  return {
    id: `${input.prefix}-${input.row.id ?? input.index}`,
    workflowId: workflowFor(input.row, `${input.prefix}-workflow-${input.index}`),
    workflowType: input.workflowType,
    kind: input.kind,
    outcome: input.outcome,
    occurredAt: dateFor(input.row),
    provider: input.provider ?? null,
    evidenceReferences: [
      referenceFor(input.row, `${input.prefix}-evidence-${input.index}`),
    ],
    governanceAction: input.governance ?? null,
    explanation: input.explanation,
    trustDelta: input.trustDelta ?? null,
    simulated: false,
  };
}

export function buildBenchmarkObservations(
  input: BenchmarkRecordInput
): BenchmarkObservation[] {
  const observations: BenchmarkObservation[] = [];

  for (const [index, row] of (input.providerSignals ?? []).entries()) {
    const status = statusFor(row);
    observations.push(
      observation({
        row,
        index,
        prefix: "provider",
        kind: "provider_verification",
        outcome: providerOutcome(status),
        workflowType: String(row.workflow_type ?? row.subject_type ?? "general"),
        provider: String(row.provider_name ?? row.provider ?? "Attributed provider"),
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          `Provider-backed workflow result retained with status ${status || "pending"}.`
        ),
      })
    );
  }

  for (const [index, row] of (input.governanceActions ?? []).entries()) {
    observations.push(
      observation({
        row,
        index,
        prefix: "governance",
        kind: "governance_escalation",
        outcome: /resolved|approved|closed/.test(statusFor(row))
          ? "resolved"
          : "review_required",
        workflowType: String(row.subject_type ?? row.workflow_type ?? "general"),
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Governance escalation retained with reviewer ownership."
        ),
      })
    );
  }

  for (const [index, row] of (input.replaySessions ?? []).entries()) {
    observations.push(
      observation({
        row,
        index,
        prefix: "replay",
        kind: "replay_reconstruction",
        outcome: row.created_at ? "completed" : "pending",
        workflowType: String(row.subject_type ?? "workflow"),
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Replay reconstruction retained as canonical operational chronology."
        ),
      })
    );
  }

  for (const [index, row] of (input.sessionIntegrityChecks ?? []).entries()) {
    const status = statusFor(row);
    if (!/fail|risk|review|interrupt|degrad|pending/.test(status) && !row.manual_review_required) {
      continue;
    }
    observations.push(
      observation({
        row,
        index,
        prefix: "session",
        kind: "session_integrity_failure",
        outcome: "review_required",
        workflowType: "interview_session",
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Session integrity state requires operational review."
        ),
      })
    );
  }

  for (const [index, row] of (input.trustEvents ?? []).entries()) {
    const source = String(
      row.event_type ?? row.event ?? row.category ?? row.risk_movement ?? ""
    ).toLowerCase();
    if (!/degrad|elevat|decrease|anomal|trust_changed/.test(source)) continue;
    const before = Number(row.previous_score ?? row.score_before);
    const after = Number(row.score ?? row.score_after);
    observations.push(
      observation({
        row,
        index,
        prefix: "trust-degradation",
        kind: "trust_degradation",
        outcome: "review_required",
        workflowType: String(row.workflow_type ?? row.subject_type ?? "general"),
        governance: governanceAction(row),
        trustDelta:
          Number.isFinite(before) && Number.isFinite(after) ? after - before : null,
        explanation: explanationFor(
          row,
          "Negative trust posture movement retained for explainable review."
        ),
      })
    );
  }

  for (const [index, row] of (input.reviewRecords ?? []).entries()) {
    const source = `${row.status ?? ""} ${row.review_type ?? ""} ${row.event_type ?? ""}`.toLowerCase();
    const kind: BenchmarkObservationKind | null = /false.?positive/.test(source)
      ? "false_positive_review"
      : /false.?negative|missed.?signal/.test(source)
        ? "false_negative_investigation"
        : null;
    if (!kind) continue;
    observations.push(
      observation({
        row,
        index,
        prefix: kind,
        kind,
        outcome: /resolved|confirmed|closed/.test(statusFor(row))
          ? "resolved"
          : "review_required",
        workflowType: String(row.workflow_type ?? row.subject_type ?? "general"),
        governance: governanceAction(row),
        explanation: explanationFor(row, `${kind.replaceAll("_", " ")} retained.`),
      })
    );
  }

  for (const [index, row] of (input.workflowRecords ?? []).entries()) {
    const status = statusFor(row);
    if (!/complete|approved|resolved|closed/.test(status)) continue;
    observations.push(
      observation({
        row,
        index,
        prefix: "completion",
        kind: "workflow_completion",
        outcome: "completed",
        workflowType: String(row.workflow_type ?? row.subject_type ?? "general"),
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Workflow completion retained for evidence and governance coverage review."
        ),
      })
    );
  }

  for (const [index, row] of (input.candidateProfiles ?? []).entries()) {
    observations.push(
      observation({
        row,
        index,
        prefix: "candidate-provenance",
        kind: "candidate_provenance",
        outcome: /verified|complete/.test(
          String(row.provenance_status ?? row.verification_status ?? "").toLowerCase()
        )
          ? "observed_success"
          : "pending",
        workflowType: "candidate",
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Candidate provenance state retained for hiring workflow review."
        ),
      })
    );
  }

  for (const [index, row] of (input.recruiterProfiles ?? []).entries()) {
    observations.push(
      observation({
        row,
        index,
        prefix: "recruiter-verification",
        kind: "recruiter_verification",
        outcome: /verified|approved/.test(statusFor(row))
          ? "observed_success"
          : "pending",
        workflowType: "recruiter",
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Recruiter verification state retained for workflow integrity review."
        ),
      })
    );
  }

  for (const [index, row] of (input.interviewRiskEvents ?? []).entries()) {
    const source = String(row.signal_type ?? row.event_type ?? row.risk_reason ?? "").toLowerCase();
    const kind: BenchmarkObservationKind = /proxy|candidate.?mismatch/.test(source)
      ? "proxy_candidate_review"
      : /voice|video|media|deepfake/.test(source)
        ? "media_mismatch_review"
        : "session_integrity_failure";
    observations.push(
      observation({
        row,
        index,
        prefix: kind,
        kind,
        outcome: "review_required",
        workflowType: "interview_session",
        governance: governanceAction(row),
        explanation: explanationFor(
          row,
          "Interview integrity signal retained for human review."
        ),
      })
    );
  }

  return observations;
}

export const benchmarkSimulationObservations: BenchmarkObservation[] = [
  {
    id: "simulation-synthetic-candidate",
    workflowId: "benchmark-simulation",
    workflowType: "candidate",
    kind: "proxy_candidate_review",
    outcome: "review_required",
    occurredAt: "2026-01-01T10:00:00.000Z",
    provider: null,
    evidenceReferences: ["synthetic candidate fixture", "candidate provenance fixture"],
    governanceAction: "Open hiring security review",
    explanation: "Controlled candidate provenance mismatch for workflow-routing validation.",
    trustDelta: -8,
    simulated: true,
  },
  {
    id: "simulation-replay-divergence",
    workflowId: "benchmark-simulation",
    workflowType: "candidate",
    kind: "replay_reconstruction",
    outcome: "review_required",
    occurredAt: "2026-01-01T10:02:00.000Z",
    provider: null,
    evidenceReferences: ["replay divergence fixture"],
    governanceAction: "Request chronology review",
    explanation: "Controlled replay divergence tests canonical reconstruction handling.",
    trustDelta: -5,
    simulated: true,
  },
  {
    id: "simulation-provider-instability",
    workflowId: "benchmark-simulation",
    workflowType: "candidate",
    kind: "provider_verification",
    outcome: "observed_failure",
    occurredAt: "2026-01-01T10:03:00.000Z",
    provider: "Simulation provider",
    evidenceReferences: ["provider instability fixture"],
    governanceAction: "Route provider evidence to review",
    explanation: "Controlled provider state change from pending to failed.",
    trustDelta: -7,
    simulated: true,
  },
  {
    id: "simulation-governance-chain",
    workflowId: "benchmark-simulation",
    workflowType: "candidate",
    kind: "governance_escalation",
    outcome: "resolved",
    occurredAt: "2026-01-01T10:04:00.000Z",
    provider: null,
    evidenceReferences: ["governance chain fixture", "reviewer action fixture"],
    governanceAction: "Evidence requested and bounded continuation recorded",
    explanation: "Controlled multi-step governance intervention chain.",
    trustDelta: 4,
    simulated: true,
  },
  {
    id: "simulation-injected-session",
    workflowId: "benchmark-simulation",
    workflowType: "interview_session",
    kind: "session_integrity_failure",
    outcome: "review_required",
    occurredAt: "2026-01-01T10:05:00.000Z",
    provider: null,
    evidenceReferences: ["injected session fixture", "channel integrity fixture"],
    governanceAction: "Hold session for human review",
    explanation: "Controlled injected-session signal tests non-punitive review routing.",
    trustDelta: -12,
    simulated: true,
  },
  {
    id: "simulation-session-integrity-failure",
    workflowId: "benchmark-simulation",
    workflowType: "interview_session",
    kind: "session_integrity_failure",
    outcome: "review_required",
    occurredAt: "2026-01-01T10:06:00.000Z",
    provider: null,
    evidenceReferences: ["session continuity fixture"],
    governanceAction: "Assign session integrity reviewer",
    explanation: "Controlled session continuity failure tests evidence and ownership display.",
    trustDelta: -9,
    simulated: true,
  },
];
