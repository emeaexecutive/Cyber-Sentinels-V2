import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  calculateTrustScoreV1,
  isRowLinkedToPassport,
} from "@/lib/trust-score-engine";
import {
  buildTrustPosture,
  latestCreatedAt,
  trustPostureClass,
} from "@/lib/trust-posture/posture";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type PassportRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  verification_status: string | null;
  review_status: string | null;
  trust_score: number | null;
  verified?: boolean | null;
  created_at: string | null;
};

type MetricResult = {
  table: string;
  label: string;
  count: number;
  available: boolean;
};

const metricTables = [
  ["passports", "Passports"],
  ["verification_cases", "Verification Cases"],
  ["evidence_files", "Evidence Files"],
  ["decisions", "Decisions"],
  ["audit_logs", "Audit Events"],
  ["signals", "Signals"],
];

const riskPillars = [
  ["Identity Verification", "Validate candidates, contractors and workforce identities before access expands."],
  ["Evidence Chain", "Attach documents, links and reviewer outcomes to the same trust record."],
  ["Interview Integrity", "Keep interview, assessment and review signals in the decision trail."],
  ["Employment Evidence", "Connect workforce claims to evidence before approval."],
  ["Scheduled Reverification", "Review trust freshness at explainable checkpoints using existing workflow records."],
  ["Audit-Ready Decisions", "Every approval, rejection and escalation leaves a defensible trail."],
];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function valueOrFallback(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return String(value);
}

function StatusChip({ value }: { value?: string | null }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
      {valueOrFallback(value)}
    </span>
  );
}

async function liveCount(table: string, label: string): Promise<MetricResult> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    table,
    label,
    count: count ?? 0,
    available: !error,
  };
}

function latestByCreatedAt(rows: AnyRow[]) {
  return [...rows].sort(
    (left, right) =>
      new Date(String(right.created_at ?? "")).getTime() -
      new Date(String(left.created_at ?? "")).getTime()
  )[0];
}

export default async function WorkforceTrustPage() {
  const supabase = await createClient();
  const [
    metrics,
    { data: passports, error: passportsError },
    { data: verificationCases },
    { data: evidenceFiles },
    { data: decisions },
    { data: auditLogs },
    { data: signals },
  ] = await Promise.all([
    Promise.all(metricTables.map(([table, label]) => liveCount(table, label))),
    supabase
      .from("passports")
      .select(
        "id,subject_name,subject_type,verification_status,review_status,trust_score,verified,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PassportRow[]>(),
    supabase.from("verification_cases").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("evidence_files").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("decisions").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("audit_logs").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("signals").select("*").limit(1000).returns<AnyRow[]>(),
  ]);

  const rows = passports ?? [];
  const cases = verificationCases ?? [];
  const allEvidence = evidenceFiles ?? [];
  const allDecisions = decisions ?? [];
  const allAuditLogs = auditLogs ?? [];
  const allSignals = signals ?? [];
  const caseIdsByPassport = new Map<string, Set<string>>();

  cases.forEach((item) => {
    if (!item.passport_id || !item.id) {
      return;
    }

    const passportId = String(item.passport_id);
    const current = caseIdsByPassport.get(passportId) ?? new Set<string>();
    current.add(String(item.id));
    caseIdsByPassport.set(passportId, current);
  });

  const registryRows = rows.map((passport) => {
    const caseIds = caseIdsByPassport.get(passport.id) ?? new Set<string>();
    const evidence = allEvidence.filter((row) =>
      isRowLinkedToPassport(row, passport.id, caseIds)
    );
    const passportDecisions = allDecisions.filter((row) =>
      isRowLinkedToPassport(row, passport.id, caseIds)
    );
    const passportAuditLogs = allAuditLogs.filter((row) =>
      isRowLinkedToPassport(row, passport.id, caseIds)
    );
    const passportSignals = allSignals.filter((row) =>
      isRowLinkedToPassport(row, passport.id, caseIds)
    );
    const trustScore = calculateTrustScoreV1({
      passport,
      evidence,
      decisions: passportDecisions,
      auditLogs: passportAuditLogs,
      signals: passportSignals,
    });
    const latestDecision = latestByCreatedAt(passportDecisions);
    const openGovernanceCount = passportDecisions.filter((row) =>
      ["pending", "in_review", "escalated"].includes(String(row.status ?? row.decision ?? ""))
    ).length;
    const posture = buildTrustPosture({
      lastVerifiedAt: passport.verified ? passport.created_at : latestDecision?.created_at ?? passport.created_at,
      lastGovernanceAt: latestDecision?.created_at,
      lastEvidenceAt: latestCreatedAt(evidence),
      lastSignalAt: latestCreatedAt(passportSignals),
      evidenceCount: evidence.length,
      signalCount: passportSignals.length,
      unresolvedGovernanceCount: openGovernanceCount,
      confidenceLabel: trustScore.confidenceLabel,
    });

    return {
      passport,
      evidenceCount: evidence.length,
      latestDecision,
      trustScore,
      posture,
    };
  });

  const postureCounts = registryRows.reduce(
    (counts, row) => ({ ...counts, [row.posture.state]: counts[row.posture.state] + 1 }),
    { fresh: 0, checkpoint: 0, reverification_due: 0, governance_review: 0 }
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Workforce Trust Layer
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Workforce Trust™
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">
                Trust does not end at hiring. Cyber Sentinels verifies identity,
                evidence, signals and review history across the workforce
                lifecycle with explainable trust posture workflows.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                Workforce trust posture evolves through consent-based enterprise records, reverification events,
                session continuity, governance review and operational history. It is not surveillance or universal identity scoring.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/passport"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                Create Trust Passport
              </Link>
              <Link
                href="/passports"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                View Trust Passports
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Trust continuity layer</p>
          <h2 className="mt-2 text-xl font-semibold">Workforce trust evolves through replayable history</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Workforce posture is a continuity view across identity evidence, employment context, session integrity,
            governance decisions, reverification checkpoints and audit-ready receipts. It shows why state changed,
            who reviewed it and what evidence remains available.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["Trust history", "Verification, evidence and review events stay connected."],
              ["Reverification", "Freshness checks appear as explainable checkpoints."],
              ["Session continuity", "Session and channel context stays separate from identity claims."],
              ["Governance continuity", "Reviewer actions decide workflow state transitions."],
              ["Operational posture", "Current state is derived from workflow evidence, not hidden monitoring."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Trust Posture
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Operational trust posture evolves over time.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Freshness indicators use existing verification, evidence,
                signals and governance history. They are scheduled review
                prompts, not automatic trust decisions.
              </p>
            </div>
            <Link
              href="/trust-replay"
              className="rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-100 hover:border-cyan-400"
            >
              Review Replay
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Fresh", postureCounts.fresh, "border-emerald-800 text-emerald-200"],
              ["Review checkpoints", postureCounts.checkpoint, "border-cyan-800 text-cyan-100"],
              ["Reverification due", postureCounts.reverification_due, "border-red-800 text-red-200"],
              ["Governance review", postureCounts.governance_review, "border-amber-800 text-amber-200"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
                <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Workforce Trust Dashboard
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Existing trust operations, workforce lens.
              </h2>
            </div>
            {metrics.some((metric) => !metric.available) ? (
              <p className="text-sm text-amber-200">Some live metrics unavailable.</p>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {metrics.map((metric) => (
              <div
                key={metric.table}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {metric.label}
                </p>
                <p className="mt-4 text-3xl font-semibold text-zinc-100">
                  {metric.available ? metric.count : "n/a"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Workforce Risk Pillars
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {riskPillars.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Candidate / Workforce Registry
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Passports with evidence, decisions and score context.
              </h2>
            </div>
            <Link
              href="/passports"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
            >
              Open Passport Registry
            </Link>
          </div>

          <div className="mt-5 hidden grid-cols-[1.2fr_0.7fr_0.9fr_0.8fr_0.8fr_1fr_1fr_auto] gap-4 border-b border-zinc-800 pb-3 text-xs uppercase tracking-[0.16em] text-zinc-500 xl:grid">
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
            <span>Trust</span>
            <span>Freshness</span>
            <span>Latest Decision</span>
            <span>Created</span>
            <span>Action</span>
          </div>

          <div className="mt-4 space-y-3">
            {registryRows.length ? (
              registryRows.map(({ passport, latestDecision, trustScore, posture }) => (
                <div
                  key={passport.id}
                  className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 xl:grid-cols-[1.2fr_0.7fr_0.9fr_0.8fr_0.8fr_1fr_1fr_auto] xl:items-center"
                >
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">Name</p>
                    <p className="font-medium text-zinc-100">
                      {valueOrFallback(passport.subject_name)}
                    </p>
                    <p className="mt-1 break-all text-xs text-zinc-600">
                      {passport.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">Type</p>
                    <p className="text-sm text-zinc-300">
                      {valueOrFallback(passport.subject_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">Status</p>
                    <StatusChip
                      value={passport.verification_status ?? passport.review_status}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">Trust</p>
                    <p className="text-2xl font-semibold text-zinc-100">
                      {trustScore.score}
                    </p>
                    <p className="mt-1 text-xs text-cyan-200">
                      {trustScore.confidenceLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">Freshness</p>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${trustPostureClass(posture.state)}`}>
                      {posture.label}
                    </span>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {posture.ageDays === null ? "No review date" : `${posture.ageDays} days old`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">
                      Latest Decision
                    </p>
                    <p className="text-sm text-zinc-300">
                      {latestDecision
                        ? [
                            latestDecision.decision,
                            latestDecision.status,
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : "No decisions recorded yet."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 xl:hidden">Created</p>
                    <p className="text-sm text-zinc-300">
                      {formatDate(passport.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/passports/${encodeURIComponent(passport.id)}`}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
                  >
                    View Passport
                  </Link>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                {passportsError
                  ? "Workforce registry unavailable."
                  : "No workforce passports found yet. Create a Trust Passport to populate this registry."}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
