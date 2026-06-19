import type { ExplainableSessionSignal } from "@/lib/session-integrity/model";

const badgeClass: Record<string, string> = {
  "Live Presence Confirmed": "border-emerald-800 text-emerald-200",
  "Channel Integrity Verified": "border-emerald-800 text-emerald-200",
  "Deepfake Risk": "border-amber-800 text-amber-200",
  "Injection Risk": "border-red-800 text-red-200",
  "Channel Integrity Failed": "border-red-800 text-red-200",
  "Manual Review Required": "border-amber-800 text-amber-200",
  "Session Review Pending": "border-zinc-700 text-zinc-300",
};

export function SessionIntegrityBadge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        badgeClass[label] ?? "border-cyan-800 text-cyan-200"
      }`}
    >
      {label}
    </span>
  );
}

export function SessionSignalCards({
  signals,
}: {
  signals: ExplainableSessionSignal[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {signals.map((signal) => (
        <article
          key={signal.category}
          className="rounded-lg border border-zinc-800 bg-black p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-semibold text-zinc-100">{signal.label}</h3>
            <SessionIntegrityBadge label={signal.badge} />
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {signal.explanation}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
            <span>Status: {signal.status}</span>
            <span>Risk: {signal.risk_level}</span>
            {signal.confidence_score !== null ? (
              <span>Risk score: {signal.confidence_score}/100</span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

