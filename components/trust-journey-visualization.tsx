export type TrustJourneyState =
  | "verified"
  | "elevated_risk"
  | "governance_review"
  | "session_integrity_failed"
  | "manual_review_required"
  | "replay_available"
  | "trusted_workforce";

export type TrustJourneyEvent = {
  id: string;
  title: string;
  description: string;
  occurredAt?: string | null;
  state: TrustJourneyState;
  score?: number | null;
};

const stateDetails: Record<TrustJourneyState, { label: string; className: string; dotClassName: string }> = {
  verified: {
    label: "Verified",
    className: "border-emerald-900 text-emerald-200",
    dotClassName: "border-emerald-500 bg-emerald-300",
  },
  elevated_risk: {
    label: "Elevated Risk",
    className: "border-red-900 text-red-200",
    dotClassName: "border-red-500 bg-red-300",
  },
  governance_review: {
    label: "Governance Review",
    className: "border-amber-900 text-amber-100",
    dotClassName: "border-amber-500 bg-amber-300",
  },
  session_integrity_failed: {
    label: "Session Integrity Failed",
    className: "border-red-900 text-red-100",
    dotClassName: "border-red-500 bg-red-300",
  },
  manual_review_required: {
    label: "Manual Review Required",
    className: "border-amber-900 text-amber-200",
    dotClassName: "border-amber-500 bg-amber-300",
  },
  replay_available: {
    label: "Replay Available",
    className: "border-cyan-900 text-cyan-100",
    dotClassName: "border-cyan-500 bg-cyan-300",
  },
  trusted_workforce: {
    label: "Trusted Workforce",
    className: "border-emerald-900 text-emerald-100",
    dotClassName: "border-emerald-500 bg-emerald-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function clampScore(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function TrustStateBadge({ state }: { state: TrustJourneyState }) {
  const detail = stateDetails[state];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${detail.className}`}>
      {detail.label}
    </span>
  );
}

export function TrustJourneyVisualization({
  title = "Operational Trust Journey",
  description = "Chronological verification, integrity and governance progression.",
  events,
  finalState,
}: {
  title?: string;
  description?: string;
  events: TrustJourneyEvent[];
  finalState?: TrustJourneyState;
}) {
  const orderedEvents = [...events]
    .sort((left, right) => {
      const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
      const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
      return leftTime - rightTime;
    })
    .map((event, index) => ({
      ...event,
      score: clampScore(event.score) ?? Math.max(25, Math.min(92, 58 + index * 6)),
    }));
  const outcome = finalState ?? orderedEvents.at(-1)?.state ?? "manual_review_required";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 print:text-zinc-600">
            Trust Journey
          </p>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 print:text-zinc-700">
            {description}
          </p>
        </div>
        <TrustStateBadge state={outcome} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Initial score</p>
          <p className="mt-2 text-2xl font-semibold">{orderedEvents[0]?.score ?? "n/a"}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Final score</p>
          <p className="mt-2 text-2xl font-semibold">{orderedEvents.at(-1)?.score ?? "n/a"}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Milestones</p>
          <p className="mt-2 text-2xl font-semibold">{orderedEvents.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {orderedEvents.length ? orderedEvents.map((event, index) => {
          const detail = stateDetails[event.state];
          return (
            <article key={event.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white md:grid-cols-[96px_1fr_190px]">
              <div>
                <p className="text-xs text-zinc-600">Step {index + 1}</p>
                <div className={`mt-3 h-3 w-3 rounded-full border ${detail.dotClassName}`} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-zinc-100 print:text-zinc-900">{event.title}</h3>
                  <TrustStateBadge state={event.state} />
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400 print:text-zinc-700">{event.description}</p>
                <p className="mt-2 text-xs text-zinc-600">{formatDate(event.occurredAt)}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Trust score</span>
                  <span>{event.score}/100</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-800 print:bg-zinc-200">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${event.score}%` }} />
                </div>
              </div>
            </article>
          );
        }) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500 print:border-zinc-300 print:bg-white">
            No trust journey events are available yet.
          </p>
        )}
      </div>
    </section>
  );
}
