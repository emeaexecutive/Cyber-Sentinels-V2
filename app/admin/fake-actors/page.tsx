import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  fakeActorStatusLabels,
  loadFakeActorQueue,
  type FakeActorStatus,
} from "@/lib/admin/fake-actors";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function statusClass(status: FakeActorStatus) {
  if (status === "blocked" || status === "removed_from_workflow") {
    return "border-red-900 bg-red-950/20 text-red-200";
  }
  if (status === "false_positive") {
    return "border-emerald-900 bg-emerald-950/20 text-emerald-200";
  }
  if (status === "governance_escalated") {
    return "border-amber-900 bg-amber-950/20 text-amber-200";
  }
  return "border-cyan-900 bg-cyan-950/20 text-cyan-200";
}

export default async function AdminFakeActorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string; status?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/fake-actors");
    }
    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/fake-actors" });
  const actors = await loadFakeActorQueue(createServiceRoleClient());
  const openReviews = actors.filter((actor) =>
    ["under_review", "governance_escalated"].includes(actor.actorStatus)
  ).length;
  const blocked = actors.filter((actor) => actor.actorStatus === "blocked").length;
  const escalated = actors.filter(
    (actor) => actor.actorStatus === "governance_escalated"
  ).length;
  const preserved = actors.filter((actor) => actor.evidencePreserved).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
                Governance enforcement
              </p>
              <h1 className="mt-3 text-4xl font-semibold">Fake Actor Review Queue</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Review candidates and sessions with elevated evidence. Labels are based on
                available evidence and remain subject to accountable governance review.
              </p>
            </div>
            <Link
              href="/dashboard/governance"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Governance queue
            </Link>
          </div>
          {query.status === "recorded" ? (
            <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
              Admin action recorded. Evidence preserved and governance history updated.
            </p>
          ) : null}
          {query.status === "failed" ? (
            <p className="mt-5 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
              The governance action could not be recorded. No workflow state was
              changed. Review the evidence and retry.
            </p>
          ) : null}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Under Review", openReviews],
            ["Workflow Access Blocked", blocked],
            ["Governance Escalated", escalated],
            ["Evidence Preserved", preserved],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Evidence-first review</h2>
              <p className="mt-2 text-sm text-zinc-500">
                No action silently deletes actor, workflow, replay, receipt or provider evidence.
              </p>
            </div>
            <p className="text-xs text-zinc-600">{actors.length} review record(s)</p>
          </div>

          <div className="mt-5 grid gap-4">
            {actors.length ? (
              actors.map((actor) => (
                <article key={`${actor.subjectType}:${actor.id}`} className="rounded-lg border border-zinc-800 bg-black p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                        {actor.subjectType.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">{actor.displayName}</h3>
                      {actor.privateContact ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          Private admin context: {actor.privateContact}
                        </p>
                      ) : null}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(actor.actorStatus)}`}>
                      {fakeActorStatusLabels[actor.actorStatus]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-zinc-600">Risk context</p>
                      <p className="mt-1 text-zinc-200">{actor.syntheticRisk}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-zinc-600">Session integrity</p>
                      <p className="mt-1 text-zinc-200">{actor.sessionIntegrity.state.replaceAll("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-zinc-600">Provider signals</p>
                      <p className="mt-1 text-zinc-200">{actor.providerSignals.length} summarized</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-zinc-600">Governance</p>
                      <p className="mt-1 text-zinc-200">{actor.governanceStatus.replaceAll("_", " ")}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm">
                    <Link href={`/admin/fake-actors/${actor.id}`} className="brand-primary-action">
                      Review actor
                    </Link>
                    {actor.replay ? (
                      <Link href={`/replay/${actor.replay.id}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">
                        Replay
                      </Link>
                    ) : null}
                    {actor.receipt ? (
                      <Link href={`/verification/receipt/${actor.receipt.id}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">
                        Receipt
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-black p-6">
                <p className="font-medium text-zinc-200">No elevated actor reviews</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Flagged candidates and suspicious sessions will appear when recorded risk,
                  session-integrity or governance evidence requires review.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
