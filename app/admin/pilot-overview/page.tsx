import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type CountResult = {
  count: number;
  available: boolean;
};

async function countTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string
): Promise<CountResult> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) return { count: 0, available: false };
  return { count: count ?? 0, available: true };
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 20,
  orderColumn = "created_at"
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<AnyRow[]>();

  return error ? [] : data ?? [];
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function metricValue(result: CountResult) {
  return result.available ? String(result.count) : "Unavailable";
}

function pilotLike(row: AnyRow) {
  return /pilot|design partner|guided demo/i.test(
    `${row.name ?? ""} ${row.slug ?? ""} ${row.description ?? ""} ${row.title ?? ""} ${row.status ?? ""} ${row.note ?? ""}`
  );
}

function rowTitle(row: AnyRow, fallback: string) {
  return String(row.title ?? row.name ?? row.receipt_summary ?? row.replay_summary ?? row.resolution_notes ?? fallback);
}

export default async function PilotOverviewPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/pilot-overview");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/pilot-overview" });

  const [
    workspaces,
    governanceActions,
    replaySessions,
    receipts,
    integrityChecks,
    riskEvents,
    workspaceCount,
    governanceCount,
    receiptCount,
  ] = await Promise.all([
    fetchRows(supabase, "trust_workspaces", 80),
    fetchRows(supabase, "governance_actions", 80),
    fetchRows(supabase, "trust_replay_sessions", 40),
    fetchRows(supabase, "verification_receipts", 40, "issued_at"),
    fetchRows(supabase, "session_integrity_checks", 40),
    fetchRows(supabase, "interview_risk_events", 40),
    countTable(supabase, "trust_workspaces"),
    countTable(supabase, "governance_actions"),
    countTable(supabase, "verification_receipts"),
  ]);

  const activePilots = workspaces.filter(pilotLike);
  const recentReviews = governanceActions.slice(0, 6);
  const pendingGovernance = governanceActions.filter((row) =>
    ["pending", "in_review", "escalated"].includes(String(row.action_status ?? "pending").toLowerCase())
  );
  const flaggedSessions = [
    ...integrityChecks.filter((row) =>
      /failed|review|risk|flag|escalated|pending/i.test(`${row.overall_status ?? ""} ${row.integrity_status ?? ""}`)
    ),
    ...riskEvents.filter((row) =>
      /high|elevated|review|injection|deepfake|synthetic/i.test(`${row.risk_level ?? ""} ${row.signal_type ?? ""} ${row.risk_reason ?? ""}`)
    ),
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Pilot Admin Overview</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Lightweight operational view for controlled enterprise pilots: active workspaces, recent reviews, pending governance actions, flagged sessions, replay availability and generated verification receipts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/founder-control" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Founder Control
              </Link>
              <Link href="/admin/deployment-readiness" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Deployment Readiness
              </Link>
              <Link href="/pilot/getting-started" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                Pilot Guide
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Active pilots", activePilots.length ? String(activePilots.length) : metricValue(workspaceCount)],
            ["Recent reviews", governanceCount.available ? String(governanceCount.count) : String(recentReviews.length)],
            ["Pending governance", String(pendingGovernance.length)],
            ["Flagged sessions", String(flaggedSessions.length)],
            ["Receipts generated", metricValue(receiptCount)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Active pilots</h2>
              <Link href="/enterprise/pilot-setup" className="text-sm text-cyan-200 underline">Create pilot</Link>
            </div>
            <div className="mt-5 grid gap-3">
              {(activePilots.length ? activePilots : workspaces.slice(0, 5)).map((row) => (
                <article key={String(row.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-semibold text-zinc-100">{rowTitle(row, "Pilot workspace")}</p>
                  <p className="mt-2 text-xs text-zinc-500">Created {formatDate(row.created_at)}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{String(row.description ?? "Pilot workspace ready for evidence, governance and replay review.")}</p>
                </article>
              ))}
              {!workspaces.length ? <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No pilot workspaces are visible yet.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Pending governance actions</h2>
            <div className="mt-5 grid gap-3">
              {pendingGovernance.slice(0, 6).map((row) => (
                <article key={String(row.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-semibold text-zinc-100">{String(row.subject_type ?? "governance action")}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{String(row.resolution_notes ?? "Human review remains open for this workflow.")}</p>
                  <p className="mt-2 text-xs text-amber-200">{String(row.action_status ?? "pending")}</p>
                </article>
              ))}
              {!pendingGovernance.length ? <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No pending governance actions are visible.</p> : null}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent reviews</h2>
            <div className="mt-5 grid gap-3">
              {recentReviews.map((row) => (
                <article key={String(row.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-300">{String(row.action_status ?? "review recorded")}</p>
                  <p className="mt-2 text-xs text-zinc-500">{formatDate(row.resolved_at ?? row.created_at)}</p>
                </article>
              ))}
              {!recentReviews.length ? <p className="text-sm text-zinc-500">No reviews recorded yet.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Flagged sessions</h2>
            <div className="mt-5 grid gap-3">
              {flaggedSessions.slice(0, 6).map((row, index) => (
                <article key={`${row.id ?? index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-300">{String(row.signal_type ?? row.overall_status ?? row.integrity_status ?? "session flag")}</p>
                  <p className="mt-2 text-xs text-zinc-500">{formatDate(row.created_at ?? row.checked_at)}</p>
                </article>
              ))}
              {!flaggedSessions.length ? <p className="text-sm text-zinc-500">No flagged sessions are visible.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Receipts and replay</h2>
            <p className="mt-2 text-sm text-zinc-500">{replaySessions.length} replay session{replaySessions.length === 1 ? "" : "s"} visible.</p>
            <div className="mt-5 grid gap-3">
              {receipts.slice(0, 5).map((row) => (
                <Link key={String(row.id)} href={`/trust/receipt/${row.id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                  <p className="font-semibold text-zinc-100">{String(row.receipt_type ?? "verification receipt")}</p>
                  <p className="mt-2 text-xs text-zinc-500">Issued {formatDate(row.issued_at ?? row.created_at)}</p>
                  <p className="mt-2 text-sm text-cyan-200">Open receipt</p>
                </Link>
              ))}
              {!receipts.length ? <p className="text-sm text-zinc-500">No verification receipts are visible.</p> : null}
              <Link href="/trust-replay" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100 hover:border-cyan-400">
                Open replay explorer
              </Link>
            </div>
          </section>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Pilot operator note</p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            This page is an oversight view, not a decision engine. Use it to confirm pilot activity, open governance work, flagged session context and receipt/replay availability before a live walkthrough.
          </p>
        </section>
      </div>
    </main>
  );
}
