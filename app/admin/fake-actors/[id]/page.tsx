import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { loadFakeActor } from "@/lib/admin/fake-actors";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminFakeActorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ action?: string; status?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect(`/login?next=/admin/fake-actors/${encodeURIComponent(id)}`);
    }
    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, {
    path: `/admin/fake-actors/${id}`,
    actorId: id,
  });
  const actor = await loadFakeActor(createServiceRoleClient(), id);
  if (!actor) notFound();
  const redirectTo = `/admin/fake-actors/${actor.id}`;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-4 text-sm text-zinc-400">
          <Link href="/admin/fake-actors" className="hover:text-white">Fake actor queue</Link>
          <Link href="/dashboard/governance" className="hover:text-white">Governance</Link>
        </nav>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
                Based on available evidence
              </p>
              <h1 className="mt-3 text-4xl font-semibold">{actor.displayName}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Review provider-backed signals, session integrity, replay and governance context
                before changing workflow access. This record is not a public accusation.
              </p>
            </div>
            <span className="rounded-full border border-cyan-900 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-100">
              {actor.actorStatusLabel}
            </span>
          </div>
          {query.status === "recorded" ? (
            <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
              Action recorded. Evidence preserved, audit event written and governance state updated.
            </p>
          ) : null}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Verification state", actor.verificationState],
            ["Governance status", actor.governanceStatus],
            ["Session integrity", actor.sessionIntegrity.state],
            ["Evidence preservation", actor.evidencePreserved ? "Evidence Preserved" : "Preservation pending"],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{value.replaceAll("_", " ")}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6">
            <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Provider-backed signals</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Normalized summaries only. Raw provider outputs and secrets are excluded.
              </p>
              <div className="mt-5 grid gap-3">
                {actor.providerSignals.length ? (
                  actor.providerSignals.map((signal) => (
                    <div key={signal.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-medium text-zinc-100">{signal.category.replaceAll("_", " ")}</p>
                        <span className="text-xs text-zinc-500">{signal.risk} risk</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{signal.summary}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        State: {signal.state}
                        {signal.confidence === null ? "" : ` · Evidence confidence: ${signal.confidence}`}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                    No normalized provider signal is attached. Requires governance review.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Evidence continuity</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {actor.replay ? (
                  <Link href={`/replay/${actor.replay.id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                    <p className="font-medium">Replay chronology</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{actor.replay.summary}</p>
                  </Link>
                ) : (
                  <div className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">Replay not yet generated.</div>
                )}
                {actor.receipt ? (
                  <Link href={`/verification/receipt/${actor.receipt.id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                    <p className="font-medium">Verification receipt</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{actor.receipt.summary}</p>
                  </Link>
                ) : (
                  <div className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">Receipt not yet issued.</div>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Session summary: {actor.sessionIntegrity.summary}
              </p>
            </article>
          </div>

          <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Controlled actions</p>
            <h2 className="mt-2 text-xl font-semibold">Governed enforcement</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Every action preserves evidence, records the admin actor and timestamp,
              writes an audit event and creates a governance event.
            </p>

            <form method="post" className="mt-5 grid gap-3">
              <input type="hidden" name="redirect_to" value={redirectTo} />
              <label className="text-sm text-zinc-300">
                Reviewer note
                <textarea
                  name="reviewer_note"
                  required
                  maxLength={2000}
                  className="mt-2 min-h-28 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
                  placeholder="Record the evidence considered, workflow impact and rationale."
                />
              </label>
              <button formAction={`/api/admin/fake-actors/${actor.id}/block`} className="rounded-lg bg-red-950 px-4 py-3 text-left text-sm font-semibold text-red-100 hover:bg-red-900">
                Block actor
                <span className="mt-1 block text-xs font-normal text-red-200/70">Workflow access blocked; evidence preserved.</span>
              </button>
              <button formAction={`/api/admin/fake-actors/${actor.id}/remove`} className="rounded-lg border border-red-900 px-4 py-3 text-left text-sm font-semibold text-red-100">
                Remove from workflow
              </button>
              <button formAction={`/api/admin/fake-actors/${actor.id}/escalate`} className="rounded-lg border border-amber-900 px-4 py-3 text-left text-sm font-semibold text-amber-100">
                Escalate to governance review
              </button>
              <button formAction={`/api/admin/fake-actors/${actor.id}/report`} className="rounded-lg border border-zinc-700 px-4 py-3 text-left text-sm font-semibold text-zinc-200">
                Report internally
              </button>
              <button formAction={`/api/admin/fake-actors/${actor.id}/false-positive`} className="rounded-lg border border-emerald-900 px-4 py-3 text-left text-sm font-semibold text-emerald-100">
                Mark as false positive
              </button>
            </form>

            <form method="post" action={`/api/admin/fake-actors/${actor.id}/export`} className="mt-3">
              <button className="w-full rounded-lg border border-cyan-900 px-4 py-3 text-left text-sm font-semibold text-cyan-100">
                Export evidence summary
                <span className="mt-1 block text-xs font-normal text-zinc-500">Normalized summaries and references only.</span>
              </button>
            </form>

            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-xs leading-5 text-zinc-500">
              <p>Evidence preserved</p>
              <p>Admin actor: {actor.lastAdminActor ?? "Recorded on next action"}</p>
              <p>Reviewer note: {actor.reviewerNote ?? "Required for enforcement"}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
