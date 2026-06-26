import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { runValidationScenarios } from "@/lib/validation/signal-testing";

export const dynamic = "force-dynamic";

function resultTone(level: string) {
  if (level === "blocked") return "border-red-800 text-red-200";
  if (level === "low") return "border-amber-800 text-amber-200";
  if (level === "moderate") return "border-cyan-800 text-cyan-200";
  return "border-emerald-800 text-emerald-200";
}

export default async function TestResultsPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/test-results");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/test-results" });

  const results = runValidationScenarios();
  const blocked = results.filter((result) => result.level === "blocked").length;
  const escalated = results.filter((result) =>
    /review|escalat|blocked|pending/i.test(result.workflowOutcome)
  ).length;
  const providerFailures = results.filter((result) => result.providerValidation.status === "failed").length;
  const missingProviderEvidence = results.filter((result) => result.providerValidation.missingEvidence.length).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                Validation Results
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Replayable signal-testing outcomes.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Results show what triggered, why it triggered, what evidence was used, provider-backed verification signals, reviewer action and trust score movement. These are controlled scenarios, not accuracy benchmarks.
              </p>
            </div>
            <Link href="/admin/test-lab" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
              Open test lab
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Scenarios", results.length],
            ["Blocked outcomes", blocked],
            ["Escalated / review outcomes", escalated],
            ["Provider failures", providerFailures],
            ["Missing provider evidence", missingProviderEvidence],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5">
          {results.map((result) => (
            <article key={result.scenario.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{result.scenario.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{result.scenario.summary}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${resultTone(result.level)}`}>
                  Score {result.scoreAfter}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                {[
                  ["What triggered", result.replayValidation.whatTriggered],
                  ["Why it triggered", result.replayValidation.whyTriggered],
                  ["Reviewer action", result.replayValidation.reviewerActions],
                  ["Workflow outcome", result.workflowOutcome],
                  ["Trust score change", result.replayValidation.trustScoreChange],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Evidence used</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.replayValidation.evidenceUsed.map((item) => (
                      <span key={item} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Provider-backed verification signal</h3>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
                    <p>Provider: {result.providerValidation.provider}</p>
                    <p>Status: {result.providerValidation.status}</p>
                    <p>Latency: {result.providerValidation.latencyMs ?? "not measured"} ms</p>
                    <p>Confidence: {result.providerValidation.confidence ?? "not available"}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    Missing provider evidence: {result.providerValidation.missingEvidence.length ? result.providerValidation.missingEvidence.join(", ") : "none"}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {result.providerEvidence.map((evidence) => (
                      <div key={`${result.scenario.id}-${evidence.provider_name}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-400">
                        <p className="font-medium text-zinc-200">
                          {evidence.provider_name}: {evidence.verification_state}
                        </p>
                        <p>{evidence.evidence_summary}</p>
                        <p className="text-zinc-500">Reference: {evidence.provider_reference}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
