import type { TrustExplanation } from "@/lib/trust-explanation/explanation";

function impactClass(impact: TrustExplanation["timeline"][number]["decisionImpact"]) {
  if (impact === "supports") return "border-emerald-800 text-emerald-200";
  if (impact === "blocks") return "border-red-800 text-red-200";
  if (impact === "escalates" || impact === "review") return "border-amber-800 text-amber-200";
  return "border-zinc-700 text-zinc-300";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function TrustExplanationTimeline({ explanation }: { explanation: TrustExplanation }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Trust Explanation Timeline</h2>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
          {explanation.timeline.length}
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {explanation.timeline.map((event, index) => (
          <article key={event.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[auto_1fr_auto] md:items-start">
            <span className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="font-semibold text-zinc-100">{event.label}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{event.detail}</p>
              <p className="mt-2 text-xs text-zinc-600">{event.source} / {formatDate(event.timestamp)}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${impactClass(event.decisionImpact)}`}>
              {event.decisionImpact}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
