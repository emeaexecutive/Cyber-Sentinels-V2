import Link from "next/link";
import {
  demoHumanPresenceGenome,
  demoHumanPresenceGenomeResult,
  hpgAuditEvents,
  hpgSignalEvents,
  hpgSignals,
} from "@/lib/trust-engine/humanPresenceGenome";

function stateClass(state: string) {
  if (state === "stable") return "border-emerald-700 text-emerald-200";
  if (state === "drifting" || state === "under_review") {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

export default function HumanPresenceGenomePage() {
  const result = demoHumanPresenceGenomeResult;
  const signalScores = [
    ["Face", demoHumanPresenceGenome.face],
    ["Voice", demoHumanPresenceGenome.voice],
    ["Behavior", demoHumanPresenceGenome.behavior],
    ["Timeline consistency", demoHumanPresenceGenome.timeline],
    ["Interaction", demoHumanPresenceGenome.interaction],
    ["Synthetic deviation", result.synthetic_deviation],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/human-presence-index", "Human Presence Index"],
            ["/trust-timeline", "Trust Timeline"],
            ["/origin-dna", "Origin DNA"],
            ["/reality-chain", "Reality Chain"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/mission-control", "Mission Control"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Multi-signal presence pattern
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Human Presence Genome™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Humans leave behavioral fingerprints long before they leave
            passwords.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Presence Confidence", result.presence_confidence],
            ["Presence Stability", result.presence_stability],
            ["Reality Alignment", result.reality_alignment],
            ["Synthetic Deviation", result.synthetic_deviation],
            ["Human Presence Genome", result.state],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold capitalize">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Presence Signature</h2>
            <code className="mt-5 block rounded-lg border border-zinc-800 bg-black p-4 text-cyan-200">
              {result.human_signature}
            </code>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${stateClass(
                result.state
              )}`}
            >
              {result.state}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Behavioral Stability</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {signalScores.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Human Pattern Signals</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {hpgSignals.map((signal) => (
                <code
                  key={signal}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {signal}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Reality Alignment</h2>
            <p className="mt-4 text-4xl font-semibold">
              {result.reality_alignment}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              HPG aligns behavior, liveness and timeline consistency with Origin
              DNA and Reality Chain changes.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Synthetic Deviation</h2>
            <p className="mt-4 text-4xl font-semibold">
              {result.synthetic_deviation}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Low deviation means the presence pattern still looks human across
              face, voice, behavior, timeline and interaction.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Timeline Changes</h2>
            <div className="mt-5 space-y-3">
              {demoHumanPresenceGenome.timeline_changes.map((item) => (
                <p
                  key={item}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Related Evidence</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {demoHumanPresenceGenome.related_evidence.map((href) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-white"
                >
                  {href}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Presence Drift</h2>
            <p className="mt-4 text-4xl font-semibold">
              {demoHumanPresenceGenome.presence_drift}
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Recommended action: {result.recommended_action}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals / Audit</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {[...hpgSignalEvents, ...hpgAuditEvents].map((item) => (
                <code
                  key={item}
                  className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200"
                >
                  {item}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
