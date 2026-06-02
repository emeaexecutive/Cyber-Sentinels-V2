import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { scoreGraphHealth } from "@/lib/trust-graph/scoreGraphHealth";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type MetricCard = {
  label: string;
  value: number | string;
  detail: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function rowDate(row: AnyRow) {
  return String(row.created_at ?? row.updated_at ?? "");
}

function metadata(row: AnyRow) {
  const value = row.metadata;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function matchesPassport(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const meta = metadata(row);
  const passportMatch =
    String(row.passport_id ?? "") === passportId ||
    String(meta.passport_id ?? "") === passportId;
  const caseId = String(
    row.verification_case_id ?? row.case_id ?? meta.verification_case_id ?? ""
  );

  return passportMatch || (caseId ? caseIds.has(caseId) : false);
}

function statusText(row: AnyRow) {
  return String(
    row.status ??
      row.verification_status ??
      row.review_status ??
      row.scan_status ??
      row.decision ??
      ""
  ).toLowerCase();
}

function riskForScore(score: number) {
  if (score >= 80) return "Low";
  if (score >= 60) return "Medium";
  if (score >= 40) return "High";
  return "Critical";
}

function riskChipClass(risk: string) {
  if (risk === "Low") return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  if (risk === "Medium") return "border-cyan-800 bg-cyan-950/20 text-cyan-100";
  if (risk === "High") return "border-amber-800 bg-amber-950/20 text-amber-200";
  return "border-red-900 bg-red-950/20 text-red-200";
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function fetchRows(table: string, limit = 200, orderColumn = "created_at") {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<AnyRow[]>();

  return data ?? [];
}

async function fetchCount(table: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return count ?? 0;
}

export default async function TrustIntelligencePage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, {
    path: "/trust-intelligence",
  });

  const [
    passportCount,
    passports,
    verificationCases,
    evidenceFiles,
    decisions,
    auditLogs,
    signals,
    stateChecks,
    executionPassports,
    helpQuestions,
    assistantQuestions,
  ] = await Promise.all([
    fetchCount("passports"),
    fetchRows("passports", 50),
    fetchRows("verification_cases", 200),
    fetchRows("evidence_files", 200),
    fetchRows("decisions", 200),
    fetchRows("audit_logs", 200),
    fetchRows("signals", 200),
    fetchRows("passport_state_checks", 200),
    fetchRows("execution_passports", 200),
    fetchRows("help_questions", 100),
    fetchRows("trust_assistant_questions", 100),
  ]);

  const passportHealth = passports.map((passport) => {
    const passportId = String(passport.id);
    const passportCases = verificationCases.filter(
      (row) => String(row.passport_id ?? "") === passportId
    );
    const caseIds = new Set(passportCases.map((row) => String(row.id)));
    const health = scoreGraphHealth({
      passport,
      verificationCases: passportCases,
      evidenceFiles: evidenceFiles.filter((row) =>
        matchesPassport(row, passportId, caseIds)
      ),
      decisions: decisions.filter((row) =>
        matchesPassport(row, passportId, caseIds)
      ),
      auditLogs: auditLogs.filter((row) =>
        matchesPassport(row, passportId, caseIds)
      ),
      signals: signals.filter(
        (row) =>
          matchesPassport(row, passportId, caseIds) ||
          String(row.event ?? "")
            .toLowerCase()
            .includes(String(passport.subject_name ?? "").toLowerCase())
      ),
      stateChecks: stateChecks.filter((row) =>
        matchesPassport(row, passportId, caseIds)
      ),
      executionPassports: executionPassports.filter((row) =>
        matchesPassport(row, passportId, caseIds)
      ),
    });

    return {
      passport,
      passportId,
      health,
      trustScore: Number(passport.trust_score ?? 0),
    };
  });

  const pendingReviews = verificationCases.filter((row) =>
    /pending|review|escalated/.test(statusText(row))
  );
  const evidencePending = evidenceFiles.filter((row) =>
    /pending|review|needs_more|rejected/.test(statusText(row))
  );
  const highRiskSignals = signals.filter((row) =>
    /high|critical|risk|escalated|manual_review|rejected|denied/i.test(
      String(row.event ?? row.severity ?? "")
    )
  );
  const openHelpQuestions = helpQuestions.filter((row) => row.status === "open");
  const aiDraftQueue = [
    ...helpQuestions.filter((row) => row.status === "drafted"),
    ...assistantQuestions.filter((row) => row.status === "drafted"),
  ];
  const executionRequests = executionPassports.filter((row) =>
    /pending|review|high|critical/.test(statusText(row))
  );
  const averageCompleteness = average(
    passportHealth.map((item) => item.health.completenessScore)
  );
  const averageTrustScore = average(passportHealth.map((item) => item.trustScore));
  const evidenceLinkageRate =
    passportHealth.length === 0
      ? 0
      : (passportHealth.filter((item) => item.health.hasEvidence).length /
          passportHealth.length) *
        100;
  const decisionCoverageRate =
    passportHealth.length === 0
      ? 0
      : (passportHealth.filter((item) => item.health.hasDecision).length /
          passportHealth.length) *
        100;
  const deniedDecisions = decisions.filter((row) =>
    /deny|denied|rejected/.test(String(row.decision ?? row.status ?? ""))
  );
  const manualReviewSignals = signals.filter((row) =>
    /manual_review|review_started|human review/i.test(String(row.event ?? ""))
  );
  const escalatedQuestions = [
    ...helpQuestions.filter((row) => row.status === "escalated"),
    ...assistantQuestions.filter((row) => row.status === "escalated"),
  ];
  const weakGraphs = passportHealth.filter(
    (item) => item.health.completenessScore < 40
  );
  const missingEvidence = passportHealth.filter((item) => !item.health.hasEvidence);
  const leaderboard = [...passportHealth].sort(
    (left, right) =>
      right.health.completenessScore - left.health.completenessScore ||
      right.trustScore - left.trustScore
  );
  const selected = leaderboard[0];
  const timeline = [
    ...passports.map((row) => ({
      label: `Passport created: ${row.subject_name ?? "Unnamed subject"}`,
      type: "Passport",
      created_at: row.created_at,
    })),
    ...evidenceFiles.map((row) => ({
      label: `Evidence ${row.status ?? "uploaded"}: ${
        row.file_name ?? row.evidence_type ?? "Evidence"
      }`,
      type: "Evidence",
      created_at: row.created_at,
    })),
    ...decisions.map((row) => ({
      label: `Decision ${row.decision ?? row.status ?? "created"}`,
      type: "Decision",
      created_at: row.created_at,
    })),
    ...auditLogs.map((row) => ({
      label: row.event_type ?? "Audit event",
      type: "Audit",
      created_at: row.created_at,
    })),
    ...signals.map((row) => ({
      label: row.event ?? "Signal",
      type: "Signal",
      created_at: row.created_at,
    })),
    ...stateChecks.map((row) => ({
      label: `State check: ${row.trust_state ?? row.risk_movement ?? "recorded"}`,
      type: "State",
      created_at: row.created_at,
    })),
    ...executionPassports.map((row) => ({
      label: `Execution request: ${
        row.execution_summary ?? row.execution_type ?? "request"
      }`,
      type: "Execution",
      created_at: row.created_at,
    })),
    ...assistantQuestions
      .filter((row) => row.status === "drafted")
      .map((row) => ({
        label: `AI answer draft: ${row.question ?? "Trust Assistant question"}`,
        type: "AI Draft",
        created_at: row.updated_at ?? row.created_at,
      })),
    ...helpQuestions
      .filter((row) => row.status === "drafted")
      .map((row) => ({
        label: `AI answer draft: ${row.question ?? "Help question"}`,
        type: "AI Draft",
        created_at: row.updated_at ?? row.created_at,
      })),
  ]
    .filter((row) => row.created_at)
    .sort(
      (left, right) =>
        new Date(String(right.created_at)).getTime() -
        new Date(String(left.created_at)).getTime()
    )
    .slice(0, 30);
  const overviewCards: MetricCard[] = [
    { label: "Active Passports", value: passportCount, detail: "Total passport records" },
    { label: "Pending Reviews", value: pendingReviews.length, detail: "Cases awaiting review" },
    { label: "Evidence Pending", value: evidencePending.length, detail: "Evidence not fully cleared" },
    { label: "High Risk Signals", value: highRiskSignals.length, detail: "Risk-bearing signal events" },
    { label: "Graph Completeness", value: percent(averageCompleteness), detail: "Average chain completeness" },
    { label: "Open Help Questions", value: openHelpQuestions.length, detail: "User questions awaiting action" },
    { label: "AI Draft Queue", value: aiDraftQueue.length, detail: "Drafts awaiting approval" },
    { label: "Execution Requests", value: executionRequests.length, detail: "Execution passports in review" },
    { label: "State Checks", value: stateChecks.length, detail: "Dynamic trust state checks" },
  ];
  const alerts = [
    {
      title: "Missing evidence",
      count: missingEvidence.length,
      risk: missingEvidence.length ? "High" : "Low",
    },
    {
      title: "Missing decisions",
      count: passportHealth.filter((item) => !item.health.hasDecision).length,
      risk: "Medium",
    },
    {
      title: "Missing signals",
      count: passportHealth.filter((item) => !item.health.hasSignalTrail).length,
      risk: "Medium",
    },
    {
      title: "Repeated manual reviews",
      count: manualReviewSignals.length,
      risk: manualReviewSignals.length > 5 ? "High" : "Medium",
    },
    {
      title: "High-risk execution requests",
      count: executionPassports.filter((row) =>
        /high|critical/.test(String(row.risk_level ?? "").toLowerCase())
      ).length,
      risk: "Critical",
    },
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Intelligence
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Intelligence Console
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Operational trust visibility.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-9">
          {overviewCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-zinc-100">
                {card.value}
              </p>
              <p className="mt-2 text-xs text-zinc-600">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Trust Risk Monitor
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ["Weak trust graphs", weakGraphs.length, "Critical"],
                ["Missing evidence", missingEvidence.length, "High"],
                ["Pending reviews", pendingReviews.length, "Medium"],
                ["Denied decisions", deniedDecisions.length, "High"],
                ["Manual review signals", manualReviewSignals.length, "Medium"],
                ["Escalated questions", escalatedQuestions.length, "High"],
              ].map(([label, count, risk]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div>
                    <p className="font-medium text-zinc-100">{label}</p>
                    <p className="mt-1 text-xs text-zinc-600">{count} live records</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${riskChipClass(String(risk))}`}>
                    {risk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Relationship Metrics
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Average Graph Completeness", percent(averageCompleteness)],
                ["Average Trust Score", Math.round(averageTrustScore)],
                ["Evidence Linkage Rate", percent(evidenceLinkageRate)],
                ["Decision Coverage Rate", percent(decisionCoverageRate)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-zinc-100">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Graph Health Leaderboard
          </p>
          <div className="mt-5 grid gap-3">
            {leaderboard.length ? (
              leaderboard.slice(0, 10).map((item) => (
                <div
                  key={item.passportId}
                  className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_auto] lg:items-center"
                >
                  <div>
                    <p className="font-medium text-zinc-100">
                      {item.passport.subject_name ?? "Unnamed passport"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {item.passport.subject_type ?? "unknown"}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-300">Trust {item.trustScore || "n/a"}</p>
                  <p className="text-sm text-zinc-300">
                    Complete {item.health.completenessScore}
                  </p>
                  <p className="text-sm text-zinc-300">
                    Evidence {item.health.evidenceCoverage}
                  </p>
                  <p className="text-sm text-zinc-300">
                    Audit {item.health.auditCoverage} / Signal{" "}
                    {item.health.signalDensity}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/passports/${encodeURIComponent(item.passportId)}`}
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                    >
                      Open Passport
                    </Link>
                    <Link
                      href={`/trust-graph-engine?passport_id=${encodeURIComponent(item.passportId)}`}
                      className="rounded-lg border border-cyan-800 px-3 py-2 text-xs text-cyan-100 hover:text-white"
                    >
                      Open Graph
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No passports available yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Operational Timeline
            </p>
            <div className="mt-5 grid gap-3">
              {timeline.map((event, index) => (
                <div
                  key={`${event.type}-${index}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm text-zinc-300">{event.label}</p>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                      {event.type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(String(event.created_at))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Explainability Console
            </p>
            {selected ? (
              <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-zinc-100">
                    {selected.passport.subject_name ?? "Selected passport"}
                  </h2>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${riskChipClass(riskForScore(selected.health.completenessScore))}`}>
                    {riskForScore(selected.health.completenessScore)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  {selected.health.explanation}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.health.missingLinks.length ? (
                    selected.health.missingLinks.map((link) => (
                      <span
                        key={link}
                        className="rounded-full border border-amber-800 bg-amber-950/20 px-2.5 py-1 text-xs text-amber-200"
                      >
                        {link}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-emerald-800 bg-emerald-950/20 px-2.5 py-1 text-xs text-emerald-200">
                      No missing links detected
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No passport selected.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Trust Intelligence Alerts
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium text-zinc-100">{alert.title}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${riskChipClass(alert.risk)}`}>
                    {alert.risk}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-zinc-100">
                  {alert.count}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
