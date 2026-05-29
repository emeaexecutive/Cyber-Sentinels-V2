import Link from "next/link";
import { redirect } from "next/navigation";
import { VerificationQueueActions } from "@/components/verification-queue-actions";
import {
  hasAdminVerifiedCookie,
  isAdminAllowlisted,
} from "@/lib/admin-auth";
import { type BackOfficeStatus } from "@/lib/back-office";
import { createClient } from "@/lib/supabase/server";
import { evaluateDecisionEngine } from "@/lib/trust-engine/decisionEngine";
import { formatTimeAgo } from "@/lib/trust-engine/liveSignals";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type VerificationCase = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  status: BackOfficeStatus | string | null;
  verification_status: BackOfficeStatus | string | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  trust_score: number | null;
  linkedin_profile_consistency: number | null;
  reviewed_by: string | null;
  created_at: string | null;
};

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

type AuditLog = {
  id: string;
  event_type: string;
  actor: string | null;
  created_at: string | null;
};

type Decision = {
  id: string;
  verification_case_id: string | null;
  decision: string | null;
  status: string | null;
  actor: string | null;
  created_at: string | null;
};

type EvidenceFile = {
  id: string;
  verification_case_id: string | null;
  file_name: string | null;
  scan_status: string | null;
  created_at: string | null;
};

async function fetchRows<T>(
  supabase: SupabaseServerClient,
  table: string,
  select: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (error) {
    return [];
  }

  return data ?? [];
}

function displayStatus(item: VerificationCase) {
  return item.verification_status ?? item.status ?? "pending";
}

function statusBadgeClass(status: string) {
  const styles: Record<BackOfficeStatus, string> = {
    pending: "border-zinc-700 text-zinc-300",
    in_review: "border-cyan-700 text-cyan-200",
    verified: "border-emerald-700 text-emerald-200",
    rejected: "border-red-800 text-red-200",
    escalated: "border-amber-700 text-amber-200",
  };

  return styles[status as BackOfficeStatus] ?? styles.pending;
}

function inferRisk(item: VerificationCase) {
  const hpi = item.human_presence_index ?? 50;
  const origin = item.origin_trace_score ?? 50;
  const trust = item.trust_score;

  if (displayStatus(item) === "escalated" || hpi < 45 || origin < 45) {
    return "critical";
  }

  if ((trust !== null && trust < 55) || hpi < 60 || origin < 60) {
    return "high";
  }

  if ((trust !== null && trust < 78) || hpi < 76 || origin < 76) {
    return "medium";
  }

  return "low";
}

function riskBadgeClass(risk: string) {
  if (risk === "critical") return "border-red-700 text-red-200";
  if (risk === "high") return "border-amber-700 text-amber-200";
  if (risk === "medium") return "border-cyan-700 text-cyan-200";

  return "border-emerald-700 text-emerald-200";
}

function formatScore(value: number | null) {
  return value === null ? "n/a" : String(Math.round(value));
}

function formatDuration(milliseconds: number | null) {
  if (!milliseconds) {
    return "n/a";
  }

  const hours = Math.max(1, Math.round(milliseconds / 1000 / 60 / 60));

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

function isToday(value: string | null) {
  return value ? new Date(value).toDateString() === new Date().toDateString() : false;
}

function averageReviewTime(cases: VerificationCase[], decisions: Decision[]) {
  const completedDurations = decisions
    .map((decision) => {
      const sourceCase = cases.find(
        (item) => item.id === decision.verification_case_id
      );

      if (!sourceCase?.created_at || !decision.created_at) {
        return null;
      }

      return (
        new Date(decision.created_at).getTime() -
        new Date(sourceCase.created_at).getTime()
      );
    })
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (!completedDurations.length) {
    return null;
  }

  return Math.round(
    completedDurations.reduce((sum, value) => sum + value, 0) /
      completedDurations.length
  );
}

export default async function VerificationQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/access");
  }

  if (!isAdminAllowlisted(user.email) || !(await hasAdminVerifiedCookie())) {
    redirect("/admin/access");
  }

  const [cases, signals, auditLogs, decisions, evidenceFiles] =
    await Promise.all([
      fetchRows<VerificationCase>(
        supabase,
        "verification_cases",
        "id,subject_name,subject_type,status,verification_status,human_presence_index,origin_trace_score,trust_score,linkedin_profile_consistency,reviewed_by,created_at",
        60
      ),
      fetchRows<Signal>(supabase, "signals", "id,event,created_at", 18),
      fetchRows<AuditLog>(
        supabase,
        "audit_logs",
        "id,event_type,actor,created_at",
        18
      ),
      fetchRows<Decision>(
        supabase,
        "decisions",
        "id,verification_case_id,decision,status,actor,created_at",
        50
      ),
      fetchRows<EvidenceFile>(
        supabase,
        "evidence_files",
        "id,verification_case_id,file_name,scan_status,created_at",
        50
      ),
    ]);

  const activeStatuses = new Set(["pending", "in_review", "escalated"]);
  const activeCases = cases.filter((item) => activeStatuses.has(displayStatus(item)));
  const escalationsToday =
    cases.filter((item) => displayStatus(item) === "escalated" && isToday(item.created_at))
      .length +
    decisions.filter((decision) => decision.status === "escalated" && isToday(decision.created_at))
      .length;
  const humanReviews = cases.filter((item) =>
    ["pending", "in_review", "escalated"].includes(displayStatus(item))
  ).length;
  const averageTime = averageReviewTime(cases, decisions);
  const latestDecisionByCase = new Map(
    decisions.map((decision) => [decision.verification_case_id, decision])
  );

  const metrics = [
    { label: "Queue Size", value: activeCases.length },
    { label: "Average Review Time", value: formatDuration(averageTime) },
    { label: "Escalations Today", value: escalationsToday },
    { label: "Human Reviews", value: humanReviews },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/admin", "Admin"],
            ["/decision-engine", "Decision Engine"],
            ["/evidence-vault", "Evidence Vault"],
            ["/verifier-network", "Verifier Network"],
            ["/trust-timeline", "Trust Timeline"],
            ["/trust-graph", "Trust Graph"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Operational trust work
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Verification Operations Queue™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Live verification work across cases, evidence, signals, audit logs
            and decisions. Every review action is routed through the protected
            admin decision loop.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
            V1 verifier assignment is prepared through the Verifier Network for
            approved reviewers and trust partners.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Live Verification Work</h2>
              <p className="mt-2 text-sm text-zinc-500">
                subject / type / human_presence / origin_trace / risk /
                review_status / time waiting / assigned reviewer
              </p>
            </div>
            <span className="rounded-full border border-emerald-700 px-3 py-1 text-xs text-emerald-200">
              Trust Layer Active
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cases.length ? (
              cases.map((item) => {
                const status = displayStatus(item);
                const risk = inferRisk(item);
                const decision = latestDecisionByCase.get(item.id);
                const suggestedDecision = evaluateDecisionEngine(item);
                const relatedEvidence = evidenceFiles.filter(
                  (file) => file.verification_case_id === item.id
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.6fr_0.7fr_0.8fr_1fr]">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Subject
                        </p>
                        <p className="mt-2 font-medium text-zinc-100">
                          {item.subject_name ?? "Unnamed subject"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Type
                        </p>
                        <p className="mt-2 text-zinc-300">
                          {item.subject_type ?? "unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Human Presence
                        </p>
                        <p className="mt-2 text-zinc-300">
                          {formatScore(item.human_presence_index)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Origin Trace
                        </p>
                        <p className="mt-2 text-zinc-300">
                          {formatScore(item.origin_trace_score)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Risk
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs ${riskBadgeClass(
                            risk
                          )}`}
                        >
                          {risk}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Review Status
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Time Waiting
                        </p>
                        <p className="mt-2 text-zinc-300">
                          {item.created_at ? formatTimeAgo(item.created_at) : "n/a"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Assigned Reviewer
                        </p>
                        <p className="mt-2 break-all text-zinc-300">
                          {item.reviewed_by ?? decision?.actor ?? "Unassigned"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-zinc-900 pt-4 md:grid-cols-[0.8fr_1fr_1.5fr]">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Suggested Decision
                        </p>
                        <p className="mt-2 text-zinc-100">
                          {suggestedDecision.decision}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Recommended Action
                        </p>
                        <p className="mt-2 text-zinc-300">
                          {suggestedDecision.recommendedAction}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Reason Codes
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestedDecision.reasonCodes.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-900 pt-4">
                      <VerificationQueueActions caseId={item.id} />
                      <Link
                        href={`/trust-timeline/${item.id}`}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                      >
                        Open Trust Timeline
                      </Link>
                      <Link
                        href="/trust-graph"
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                      >
                        Open Trust Graph
                      </Link>
                      {relatedEvidence.length ? (
                        <Link
                          href={`/evidence-vault?case=${encodeURIComponent(
                            item.id
                          )}`}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                        >
                          View {relatedEvidence.length} evidence file
                          {relatedEvidence.length === 1 ? "" : "s"}
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-600">
                          No evidence files linked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500">
                No live verification cases. Optional queue tables can be empty
                without interrupting operations.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Queue Signals</h2>
            <div className="mt-5 space-y-3">
              {signals.length ? (
                signals.slice(0, 6).map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-lg border border-zinc-800 p-4"
                  >
                    <p className="text-zinc-300">{signal.event}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {signal.created_at ? formatTimeAgo(signal.created_at) : "n/a"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No queue signals yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Review Audit</h2>
            <div className="mt-5 space-y-3">
              {auditLogs.length ? (
                auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-zinc-800 p-4"
                  >
                    <p className="text-zinc-300">{log.event_type}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {log.actor ?? "system"} /{" "}
                      {log.created_at ? formatTimeAgo(log.created_at) : "n/a"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No review audit events yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Work</h2>
            <div className="mt-5 space-y-3">
              {evidenceFiles.length ? (
                evidenceFiles.slice(0, 6).map((file) => (
                  <div
                    key={file.id}
                    className="rounded-lg border border-zinc-800 p-4"
                  >
                    <p className="font-medium">
                      {file.file_name ?? "Evidence file"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {file.scan_status ?? "pending_scan"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No evidence files queued.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
