import type { DecisionIntelligence } from "@/lib/core/decision-intelligence";

const decisionClass: Record<DecisionIntelligence["decision"], string> = {
  ALLOW: "border-emerald-800 bg-emerald-950/20 text-emerald-100",
  REVIEW: "border-cyan-800 bg-cyan-950/20 text-cyan-100",
  ESCALATE: "border-amber-800 bg-amber-950/20 text-amber-100",
  BLOCK: "border-red-900 bg-red-950/20 text-red-100",
};

export function EnterpriseDecisionCard({ intelligence }: { intelligence: DecisionIntelligence }) {
  const card = intelligence.enterprise_card;
  return (
    <section className="rounded-lg border border-cyan-900 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Decision Intelligence</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-100">{intelligence.decision_summary}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${decisionClass[card.decision]}`}>
          {card.decision}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Confidence", card.confidence_label],
          ["Evidence", card.evidence_count],
          ["Replay", card.replay_available ? "Available" : "Missing"],
          ["Governance", card.governance_status],
          ["Human Review", card.human_review_status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-800 bg-black p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Top reasons</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
            {card.top_reasons.length ? card.top_reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>No reason recorded.</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Next action</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{card.next_recommended_action}</p>
        </div>
      </div>
    </section>
  );
}
