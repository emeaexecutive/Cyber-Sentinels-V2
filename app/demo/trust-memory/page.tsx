import { ExecutiveSummary } from "@/components/executive-summary";
import { buildTrustMemorySnapshot, demoTrustMemoryEvents } from "@/lib/trust-memory/trust-memory";
import { demoLifecycleDashboard, phaseLabel } from "@/lib/core/trust-lifecycle";

const tone: Record<string, string> = {
  "Trust gained": "border-emerald-800 text-emerald-200",
  "Trust restored": "border-cyan-800 text-cyan-200",
  "Trust lost": "border-red-900 text-red-200",
  "Trust decayed": "border-amber-800 text-amber-200",
  "Trust challenged": "border-orange-800 text-orange-200",
  "Trust confirmed": "border-emerald-800 text-emerald-200",
};

function memoryState(change: string) {
  if (["recovered", "restored"].includes(change)) return "Trust restored";
  if (change === "decayed") return "Trust decayed";
  if (["escalated", "insufficient_evidence"].includes(change)) return "Trust challenged";
  if (["decreased", "blocked"].includes(change)) return "Trust lost";
  if (change === "increased") return "Trust gained";
  return "Trust confirmed";
}

export default function DemoTrustMemoryPage() {
  const snapshot = buildTrustMemorySnapshot(demoTrustMemoryEvents);

  return (
    <main className="operational-shell min-h-screen px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <ExecutiveSummary
          eyebrow="Trust Memory\u2122 Demo"
          title="See how trust changed, why it changed and whether governance restored it."
          bullets={["Timeline events use decision language rather than database fields.", "Every change retains an evidence count and review context.", "No raw customer record is shown.", "Replay proves chronology; Trust Memory\u2122 explains evolution."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
          secondary={{ href: "/verification-replay", label: "View Replay" }}
        />

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="operational-eyebrow">Continuous Trust Lifecycle demo</p>
          <h2 className="mt-2 text-2xl font-semibold">Runtime trust changed and governance action became outstanding.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Lifecycle stage", phaseLabel(demoLifecycleDashboard.currentStage)],
              ["Trust posture", demoLifecycleDashboard.currentTrustPosture.replaceAll("_", " ")],
              ["Evidence completeness", `${demoLifecycleDashboard.evidenceCompleteness}%`],
              ["Governance", demoLifecycleDashboard.governanceState.replaceAll("_", " ")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                <p className="mt-2 text-sm font-semibold capitalize text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-400">{demoLifecycleDashboard.trustMemorySummary}</p>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap gap-2">
            {Object.keys(tone).map((state) => (
              <span key={state} className={`rounded-full border px-3 py-1 text-xs ${tone[state]}`}>{state}</span>
            ))}
          </div>
          <div className="mt-6 border-l border-zinc-800 pl-5">
            {snapshot.events.map((event, index) => {
              const state = memoryState(event.trust_change);
              return (
                <article key={event.id} className="relative pb-8">
                  <span className="absolute -left-[1.52rem] top-1 h-3 w-3 rounded-full border border-cyan-500 bg-black" />
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Decision event {index + 1}</p>
                        <h2 className="mt-2 text-xl font-semibold text-zinc-100">{event.explanation.summary}</h2>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone[state]}`}>{state}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-zinc-400">{event.reason}</p>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <p><span className="text-zinc-500">Posture:</span> {event.trust_state_before} to {event.trust_state_after}</p>
                      <p><span className="text-zinc-500">Evidence:</span> {event.evidence_refs.length} linked reference(s)</p>
                      <p><span className="text-zinc-500">Review:</span> {event.reviewed_outcome_ref ? "Human reviewed" : "Governance context retained"}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
