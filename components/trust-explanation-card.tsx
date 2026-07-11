import type { TrustExplanation } from "@/lib/trust-explanation/explanation";

function decisionClass(decision: TrustExplanation["decision"]) {
  if (decision === "ALLOW") return "border-emerald-800 text-emerald-200";
  if (decision === "BLOCK") return "border-red-800 text-red-200";
  if (decision === "ESCALATE") return "border-amber-800 text-amber-200";
  return "border-cyan-800 text-cyan-200";
}

export function TrustExplanationCard({ explanation }: { explanation: TrustExplanation }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Trust Explanation
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {explanation.workflow.subjectType} / {explanation.workflow.subjectId}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            {explanation.why[0] ?? "No explanation is recorded."}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${decisionClass(explanation.decision)}`}>
          {explanation.decision}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          ["Evidence", explanation.evidence.length],
          ["Providers", explanation.providers.length],
          ["Runtime signals", explanation.runtimeSignals.length],
          ["Graph relationships", explanation.evidenceGraphRelationships.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-black p-4">
          <h3 className="font-semibold text-zinc-100">Why</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
            {explanation.why.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black p-4">
          <h3 className="font-semibold text-zinc-100">Governance Policy</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {explanation.governancePolicy.policyName} / {explanation.governancePolicy.outcome}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{explanation.governancePolicy.rationale}</p>
        </div>
      </div>
    </section>
  );
}
