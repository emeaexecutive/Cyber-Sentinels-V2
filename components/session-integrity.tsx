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

export function DetectionEvidenceNote({
  title = "Detection evidence explainability",
  summary = "Detection is one signal. Session integrity, evidence and governance determine the final review state. This is not a standalone deepfake verdict.",
  markers = [
    "Why flagged: session, media or channel evidence changed from the expected workflow context.",
    "Confidence explanation: scores describe review priority, not certainty or final authenticity.",
    "Evidence markers: liveness, media risk, injection risk, device-channel state, timestamps and reviewer notes stay separate.",
    "Metadata/channel integrity: missing, shifted or inconsistent metadata increases review need without deciding the case alone.",
  ],
  reportLanguage = "Investigation report language should state what was observed, what evidence supports the flag, what remains unresolved and which reviewer or governance action determines the outcome.",
}: {
  title?: string;
  summary?: string;
  markers?: string[];
  reportLanguage?: string;
}) {
  return (
    <section className="rounded-lg border border-cyan-950 bg-zinc-950 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
        Explainability guardrail
      </p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{summary}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {markers.map((marker) => (
          <p
            key={marker}
            className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400"
          >
            {marker}
          </p>
        ))}
      </div>
      <p className="mt-4 rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">
        {reportLanguage}
      </p>
    </section>
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
          <p className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-400">
            Detection is one signal. This flag explains why review priority changed; it does not
            decide the final session state by itself.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
            <span>Status: {signal.status}</span>
            <span>Risk: {signal.risk_level}</span>
            {signal.confidence_score !== null ? (
              <span>Review priority score: {signal.confidence_score}/100</span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

