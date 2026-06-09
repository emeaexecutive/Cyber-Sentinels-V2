const copy = {
  workspace:
    "Workspace groups trust cases, reviews, evidence and governance activity for one operational context.",
  trustCase:
    "Trust cases organize the review objective, owner, priority and next action.",
  evidence:
    "Evidence is the reviewable material behind a trust workflow. Demo evidence is sample-only.",
  governance:
    "Governance actions keep human review accountable: approve, reject, escalate, defer or request evidence.",
  timeline:
    "Timeline shows how trust changed over time without turning the product into a surveillance feed.",
  replay:
    "Replay reconstructs historical workflow state so teams can understand how decisions evolved.",
  receipt:
    "Trust receipts summarize status, evidence and reviewer context in a portable, explainable format.",
} as const;

type WalkthroughArea = keyof typeof copy;

export function OnboardingHint({ area }: { area: WalkthroughArea }) {
  return (
    <aside className="rounded-lg border border-cyan-900 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
        Walkthrough tip
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{copy[area]}</p>
    </aside>
  );
}
