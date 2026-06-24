const copy = {
  workspace:
    "Workspace groups verification cases, reviews, evidence and governance activity for one operational context. Start with the queue, then clear overdue actions.",
  trustCase:
    "Verification cases organize status, reviewer, unresolved flags, linked evidence, governance actions and the next required step.",
  evidence:
    "Evidence uploaded successfully moves the workflow into governance review. Reviewers can approve, request more evidence or escalate.",
  governance:
    "Governance actions show why review was triggered, who owns it, what evidence supports it and whether escalation is required.",
  timeline:
    "Timeline shows how trust changed over time as operational chronology, not a passive activity feed.",
  replay:
    "Replay reconstructs historical workflow state so teams can understand how decisions evolved.",
  receipt:
    "Verification receipt available: status, evidence, pending work and governance context are summarized without exposing private operational detail.",
} as const;

type WalkthroughArea = keyof typeof copy;

export function OnboardingHint({ area }: { area: WalkthroughArea }) {
  return (
    <aside className="rounded-lg border border-cyan-900 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
        Walkthrough tip
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{copy[area]}</p>
    </aside>
  );
}
