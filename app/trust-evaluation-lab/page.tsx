import type { Metadata } from "next";
import Link from "next/link";
import { BenchmarkCard } from "@/components/trust-evaluation/BenchmarkCard";
import {
  trustEvaluationBenchmarks,
  trustEvaluationDomains,
} from "@/lib/trustEvaluationBenchmarks";

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
            Benchmarking humans, AI agents and enterprise workflows before they
            are trusted.
          </p>
          <p className="mt-6 max-w-4xl border-l-2 border-cyan-700 pl-4 text-sm leading-7 text-zinc-300">
            AI evaluation asks: did the model answer correctly? Cyber Sentinels
            asks: should this human, agent, workflow or action be trusted?
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

        <section className="mt-12 flex flex-col gap-5 rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              Evidence before claims
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Evaluation results should become operational claims only after
              representative data, documented conditions and accountable review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/methodology" className="brand-secondary-action">
              View methodology
            </Link>
            <Link href="/status/verification" className="brand-primary-action">
              Verification maturity
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
