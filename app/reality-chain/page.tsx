import Link from "next/link";
import { demoOriginDNARecords } from "@/lib/trust-engine/originDNA";
import { createRealityChain, demoRealityChains } from "@/lib/trust-engine/realityChain";

function driftClass(value: string) {
  if (value === "critical" || value === "high") return "border-red-700 text-red-200";
  if (value === "medium") return "border-amber-700 text-amber-200";

  return "border-emerald-700 text-emerald-200";
}

export default function RealityChainPage() {
  const record = demoOriginDNARecords[0];
  const chain = createRealityChain(record);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/origin-dna", "Origin DNA"],
            ["/origin-trace", "Origin Trace"],
            ["/reality-passport", "Reality Passport"],
            ["/human-presence-genome", "Human Presence Genome"],
            ["/evidence-vault", "Evidence Vault"],
            ["/trust-prediction", "Prediction Engine"],
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
            Provenance over time
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Reality Chain™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Reality leaves fingerprints.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Reality Drift", chain.reality_drift],
            ["Origin Confidence", chain.origin_confidence],
            ["Transformation Count", chain.steps.length],
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Transformation History</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {chain.steps.map((step, index) => (
              <div
                key={step.id}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Step {index + 1}
                </p>
                <p className="mt-3 font-medium text-zinc-100">{step.label}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Confidence {step.confidence_after_event}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Generation Chain</h2>
            <div className="mt-5 space-y-3">
              {chain.generation_chain.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Synthetic Indicators</h2>
            <div className="mt-5 space-y-3">
              {chain.synthetic_indicators.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Original Source</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              {record.source} through {record.capture_type}.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Origin Confidence</h2>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${driftClass(
                chain.reality_drift
              )}`}
            >
              {chain.origin_confidence}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Human Presence impact</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              {chain.human_presence_impact}
            </p>
            <Link
              href="/human-presence-genome"
              className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open HPG
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence links</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {chain.evidence_links.map((href) => (
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
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Related signals</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {chain.related_signals.map((signal) => (
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
            <h2 className="text-xl font-semibold">Demo Reality Chains</h2>
            <div className="mt-5 space-y-3">
              {demoRealityChains.map((item) => (
                <div
                  key={item.subject_name}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-zinc-300">{item.subject_name}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${driftClass(item.reality_drift)}`}>
                      {item.reality_drift}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
