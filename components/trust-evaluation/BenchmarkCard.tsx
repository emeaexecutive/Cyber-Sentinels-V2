import type {
  TrustEvaluationBenchmark,
  TrustEvaluationBenchmarkStatus,
} from "@/lib/trustEvaluationBenchmarks";

const statusStyles: Record<TrustEvaluationBenchmarkStatus, string> = {
  Concept: "border-zinc-700 bg-zinc-900 text-zinc-200",
  Prototype: "border-cyan-900 bg-cyan-950/40 text-cyan-200",
  Planned: "border-amber-900 bg-amber-950/30 text-amber-200",
};

export function BenchmarkCard({
  benchmark,
}: {
  benchmark: TrustEvaluationBenchmark;
}) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-zinc-800 bg-black p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="break-words text-lg font-semibold text-zinc-100">
          {benchmark.name}
        </h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[benchmark.status]}`}
        >
          {benchmark.status}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-300">{benchmark.scope}</p>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Evaluation focus
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-zinc-300">
          {benchmark.evaluationFocus.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-5 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
        {benchmark.boundary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
          Provider-backed: not yet validated
        </span>
        <span className="rounded-full border border-amber-900 px-2.5 py-1 text-amber-200">
          Validation required
        </span>
      </div>
    </article>
  );
}
