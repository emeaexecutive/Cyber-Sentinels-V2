import type { Metadata } from "next";
import Link from "next/link";
import { BenchmarkCard } from "@/components/trust-evaluation/BenchmarkCard";
import {
  trustEvaluationBenchmarks,
  trustEvaluationDomains,
} from "@/lib/trustEvaluationBenchmarks";
import { simulationScenarios } from "@/lib/simulationScenarios";

export const metadata: Metadata = {
  title: "Trust Evaluation Lab | Cyber Sentinels",
  description:
    "A concept framework for evaluating human, AI-agent and enterprise workflow trust before adoption.",
};

export default function TrustEvaluationLabPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Evaluation framework
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Trust Evaluation Lab
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">
            Operational trust for intelligent systems.
          </p>
          <p className="mt-6 max-w-4xl border-l-2 border-cyan-700 pl-4 text-sm leading-7 text-zinc-300">
            Concept, simulated and prototype evaluations ask whether a human,
            agent, workflow or action should be trusted. Provider-backed validation is required.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-amber-900/70 bg-amber-950/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
            Evaluation boundary
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-300">
            The benchmark names below are evaluation concepts at different
            maturity stages. They do not represent published studies, production
            performance, accuracy measurements or independent validation.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="evaluation-areas">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Evaluation areas
            </p>
            <h2 id="evaluation-areas" className="mt-3 text-3xl font-semibold">
              Trust questions before operational adoption
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Each area examines evidence continuity, operational context and
              accountable governance without reducing trust to a single score.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trustEvaluationDomains.map((domain) => (
              <article
                key={domain.title}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
              >
                <h3 className="text-lg font-semibold text-zinc-100">
                  {domain.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {domain.summary}
                </p>
                <ul className="mt-4 grid gap-2 border-t border-zinc-800 pt-4 text-sm text-zinc-300">
                  {domain.questions.map((question) => (
                    <li key={question} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="benchmark-concepts">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Benchmark concepts
            </p>
            <h2 id="benchmark-concepts" className="mt-3 text-3xl font-semibold">
              Defined scopes, explicit maturity
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Status labels describe development maturity only. They are not
              grades, readiness decisions or benchmark outcomes.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trustEvaluationBenchmarks.map((benchmark) => (
              <BenchmarkCard key={benchmark.name} benchmark={benchmark} />
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="evaluation-scenarios">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Evaluation scenarios
            </p>
            <h2 id="evaluation-scenarios" className="mt-3 text-3xl font-semibold">
              Operational examples with explicit boundaries
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              These reusable scenarios demonstrate workflow behavior and
              explainability. Their labels distinguish simulations, concepts,
              prototypes and placeholders from live enterprise evidence.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {simulationScenarios.map((scenario) => (
              <article
                key={scenario.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                      {scenario.category}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                      {scenario.name}
                    </h3>
                  </div>
                  <span className="rounded-full border border-cyan-900 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-200">
                    {scenario.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {scenario.summary}
                </p>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-black p-3">
                    <dt className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                      Trust Posture
                    </dt>
                    <dd className="mt-2 text-zinc-200">
                      {scenario.initialPosture} → {scenario.finalPosture}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black p-3">
                    <dt className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                      Provider state
                    </dt>
                    <dd className="mt-2 text-zinc-200">{scenario.providerState}</dd>
                    <dd className="mt-1 text-xs text-zinc-500">
                      Provider-backed: {scenario.providerState === "Simulated" ? "simulated structure" : "validation required"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  <span className="font-medium text-zinc-200">Evaluation question:</span>{" "}
                  {scenario.evaluationQuestion}
                </p>
                <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                    Provider evidence structure
                  </p>
                  <ul className="mt-2 grid gap-1 text-xs leading-5 text-zinc-300">
                    {scenario.providerEvidenceSummaries.map((summary) => (
                      <li key={summary}>{summary}</li>
                    ))}
                  </ul>
                </div>
                <p className="mt-3 text-sm leading-6 text-amber-200">
                  {scenario.manualReviewIndicator}
                </p>
                <p className="mt-3 text-xs leading-5 text-zinc-400">
                  <span className="font-medium text-zinc-300">False-positive handling:</span>{" "}
                  {scenario.falsePositiveHandling}
                </p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {scenario.limitation}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
                  Validation required
                </p>
                <Link
                  href={`/replay/demo?scenario=${scenario.id}`}
                  className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-white"
                >
                  Open scenario Replay Timeline
                </Link>
              </article>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
