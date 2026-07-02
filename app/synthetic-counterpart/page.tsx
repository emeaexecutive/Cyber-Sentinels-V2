import Link from "next/link";
import {
  demoSyntheticCounterpartInput,
  demoSyntheticCounterpartResult,
  syntheticCounterpartAuditEvents,
  syntheticCounterpartSignals,
} from "@/lib/trust-engine/syntheticCounterpart";

function riskClass(value: string) {
  if (value === "high" || value === "critical") return "border-red-700 text-red-200";
  if (value === "elevated" || value === "watch") {
    return "border-amber-700 text-amber-200";
  }

  return "border-emerald-700 text-emerald-200";
}

export default function SyntheticCounterpartPage() {
  const result = demoSyntheticCounterpartResult;
  const exposureCards = [
    ["Public interviews", "high"],
    ["Voice exposure", "high"],
    ["Video exposure", "medium"],
    ["Evidence strength", "high"],
    ["Public profile exposure", demoSyntheticCounterpartInput.public_profile_exposure],
    ["Social signal density", demoSyntheticCounterpartInput.social_signal_density],
    ["Media exposure", demoSyntheticCounterpartInput.media_exposure],
    ["Evidence chain strength", demoSyntheticCounterpartInput.evidence_chain_strength],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/reality-twin", "Identity Exposure Review"],
            ["/human-presence-genome", "Presence Evidence"],
            ["/origin-dna", "Identity Provenance"],
            ["/reality-chain", "Evidence Chain"],
            ["/permissions-firewall", "Operational Authorization"],
            ["/dashboard/governance", "Governance Review"],
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
            Synthetic impersonation forecast
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Identity Duplication Risk
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Review impersonation and duplication evidence as one bounded input
            to Trust Posture, not as an automatic identity verdict.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Synthetic Clone Risk", result.risk_state],
            ["Reality Resilience", result.reality_resilience],
            ["Identity Exposure", result.identity_exposure],
            ["Clone Complexity", result.clone_complexity],
            ["Impersonation Probability", result.impersonation_probability],
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Exposure Surface</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {exposureCards.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Clone Risk</h2>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${riskClass(
                result.risk_state
              )}`}
            >
              {result.risk_state}
            </span>
            <div className="mt-6 space-y-3">
              {result.recommendations.map((item) => (
                <p
                  key={item}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-zinc-300"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          {[
            ["Public Signal Density", demoSyntheticCounterpartInput.social_signal_density],
            ["Evidence Strength", demoSyntheticCounterpartInput.evidence_chain_strength],
            ["Behavioral Stability", demoSyntheticCounterpartInput.behavior_pattern],
            ["Synthetic Probability", result.impersonation_probability],
          ].map(([title, value]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-4 text-4xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {syntheticCounterpartSignals.map((signal) => (
                <code
                  key={signal}
                  className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200"
                >
                  {signal}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {syntheticCounterpartAuditEvents.map((event) => (
                <code
                  key={event}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {event}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
