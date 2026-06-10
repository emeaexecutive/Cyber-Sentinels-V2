import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import {
  auditTrustIntegrity,
  runTrustIntegrityRepair,
  type TrustIntegrityRepairAction,
  type TrustIntegritySummary,
} from "@/lib/trust-integrity/repair";

export const dynamic = "force-dynamic";

const repairActions = [
  ["audit", "Run Audit"],
  ["rebuild_timelines", "Rebuild Timelines"],
  ["rebuild_relationships", "Rebuild Relationships"],
  ["regenerate_receipts", "Regenerate Receipts"],
  ["repair_replay_ordering", "Repair Replay Ordering"],
  ["run_all", "Run All Repairs"],
] as const;

const repairActionValues = new Set<TrustIntegrityRepairAction>(
  repairActions.map(([action]) => action)
);

async function runRepairAction(formData: FormData) {
  "use server";

  const actionValue = String(formData.get("action") ?? "audit");
  const action = repairActionValues.has(actionValue as TrustIntegrityRepairAction)
    ? (actionValue as TrustIntegrityRepairAction)
    : "audit";
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/trust-integrity");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/trust-integrity", action });

  try {
    await runTrustIntegrityRepair(action);
    redirect(`/admin/trust-integrity?ran=${encodeURIComponent(action)}`);
  } catch (error) {
    console.error("Trust integrity repair failed.", error);
    redirect("/admin/trust-integrity?error=repair_failed");
  }
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function issueState(count: number) {
  if (count === 0) return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  if (count < 5) return "border-amber-800 bg-amber-950/20 text-amber-200";
  return "border-red-800 bg-red-950/20 text-red-200";
}

function EmptySummary() {
  return (
    <section className="mt-8 rounded-lg border border-amber-900 bg-amber-950/20 p-5 text-sm leading-6 text-amber-100">
      Trust integrity audit is unavailable. Confirm Supabase service-role
      configuration before running repair actions.
    </section>
  );
}

function SummaryCards({ summary }: { summary: TrustIntegritySummary }) {
  const totalIssues = Object.values(summary.issues).reduce((sum, value) => sum + value, 0);
  const availableTables = Object.keys(summary.counts).length - summary.unavailableTables.length;

  return (
    <>
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {[
          ["Available Tables", availableTables],
          ["Unavailable Tables", summary.unavailableTables.length],
          ["Integrity Issues", totalIssues],
          ["Timeline Events", summary.counts.trust_timeline_events ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Relationship And Workflow Checks</h2>
          <div className="mt-5 grid gap-3">
            {Object.entries(summary.issues).map(([key, count]) => (
              <div
                key={key}
                className={`rounded-lg border p-4 text-sm ${issueState(count)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="capitalize">{formatLabel(key)}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Table Coverage</h2>
          <div className="mt-5 grid gap-2">
            {Object.entries(summary.counts).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black p-3 text-sm">
                <span className="text-zinc-400">{table}</span>
                <span className="font-medium text-zinc-100">{count}</span>
              </div>
            ))}
          </div>
          {summary.unavailableTables.length ? (
            <div className="mt-5 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
              {summary.unavailableTables.map((table) => (
                <p key={table}>{table}</p>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
}

export default async function AdminTrustIntegrityPage({
  searchParams,
}: {
  searchParams?: Promise<{ ran?: string; error?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/trust-integrity");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/trust-integrity" });

  let summary: TrustIntegritySummary | null = null;

  try {
    summary = await auditTrustIntegrity();
  } catch (error) {
    console.warn("Trust integrity audit unavailable.", error);
  }

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Trust Integrity Repair</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Lightweight operational repair tools for timeline continuity,
                trust relationships, verification receipts and replay ordering.
                Repairs backfill missing continuity records without changing
                workflow decisions.
              </p>
            </div>
            <Link
              href="/admin/runtime-validation"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Runtime Validation
            </Link>
          </div>

          {query.ran ? (
            <div className="mt-5 rounded-lg border border-cyan-900 bg-cyan-950/20 p-4 text-sm text-cyan-100">
              Trust integrity action completed: {formatLabel(query.ran)}.
            </div>
          ) : null}

          {query.error ? (
            <div className="mt-5 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
              Trust integrity action could not complete. Check service-role
              configuration and table availability.
            </div>
          ) : null}
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          {repairActions.map(([action, label]) => (
            <form key={action} action={runRepairAction}>
              <input type="hidden" name="action" value={action} />
              <button className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-left text-sm font-medium text-zinc-200 hover:border-cyan-800 hover:text-white">
                {label}
              </button>
            </form>
          ))}
        </section>

        {summary ? <SummaryCards summary={summary} /> : <EmptySummary />}
      </div>
    </main>
  );
}
