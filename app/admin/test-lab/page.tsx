import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { runValidationScenarios } from "@/lib/validation/signal-testing";

export const dynamic = "force-dynamic";

function toneClass(level: string) {
  if (level === "blocked") return "border-red-800 text-red-200";
  if (level === "low") return "border-amber-800 text-amber-200";
  if (level === "moderate") return "border-cyan-800 text-cyan-200";
  return "border-emerald-800 text-emerald-200";
}

export default async function TestLabPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/test-lab");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/test-lab" });

  const results = runValidationScenarios();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                Validation Test Lab
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Controlled trust-signal scenarios.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Run deterministic scenarios for identity confidence, provider-backed verification signals, session integrity, behavioral consistency, evidence completeness and governance review state. These are rule-based validation cases, not benchmark results.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/test-results" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                Test results
              </Link>
              <Link href="/admin/verification-testbench" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Verification testbench
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {results.map((result) => (
            <article key={result.scenario.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    {result.scenario.scenarioType.replaceAll("_", " ")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{result.scenario.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                    {result.scenario.summary}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${toneClass(result.level)}`}>
                  {result.level} / {result.score}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Test signal categories</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {result.scoreContributions.map((item) => (
                      <div key={item.category} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">Raw: {item.rawValue}</p>
                        <p className="mt-1 text-sm text-cyan-200">Contribution: {item.contribution}</p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{item.notes}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Workflow outcome</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{result.workflowOutcome}</p>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-100">Trust score calculation</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {result.scoreBefore} to {result.scoreAfter} ({result.scoreDelta >= 0 ? "+" : ""}{result.scoreDelta})
                  </p>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-100">Escalation reasons</h3>
                  <div className="mt-3 grid gap-2">
                    {result.escalationReasons.map((reason) => (
                      <p key={reason} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-400">
                        {reason}
                      </p>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Triggered flags</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.triggeredFlags.length ? (
                      result.triggeredFlags.map((flag) => (
                        <span key={flag} className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200">
                        No rule-based flags
                      </span>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Provider-backed verification signal</h3>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                    <p>Provider: {result.providerValidation.provider}</p>
                    <p>Status: {result.providerValidation.status}</p>
                    <p>Latency: {result.providerValidation.latencyMs ?? "not measured"} ms</p>
                    <p>Provider confidence: {result.providerValidation.confidence ?? "not available"}</p>
                    <p>Missing evidence: {result.providerValidation.missingEvidence.length ? result.providerValidation.missingEvidence.join(", ") : "none"}</p>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {result.providerEvidence.map((evidence) => (
                      <div key={`${result.scenario.id}-${evidence.provider_name}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-400">
                        <p className="font-medium text-zinc-200">{evidence.provider_name}: {evidence.verification_state}</p>
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
