import Link from "next/link";
import {
  demoOriginDNARecords,
  originDNAAuditEvents,
  originDNASignals,
  realityStates,
  transformationEvents,
} from "@/lib/trust-engine/originDNA";
import { createRealityChain } from "@/lib/trust-engine/realityChain";

function confidenceClass(value: number) {
  if (value >= 75) return "border-emerald-700 text-emerald-200";
  if (value >= 55) return "border-amber-700 text-amber-200";

  return "border-red-700 text-red-200";
}

export default function OriginDNAPage() {
  const primary = demoOriginDNARecords[0];
  const chain = createRealityChain(primary);
  const chainSections: Array<{ title: string; values: string[] }> = [
    {
      title: "Transformation History",
      values: primary.transformation_events,
    },
    {
      title: "Generation Chain",
      values: chain.generation_chain,
    },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/reality-chain", "Reality Chain"],
            ["/origin-trace", "Origin Trace"],
            ["/reality-passport", "Reality Passport"],
            ["/evidence-vault", "Evidence Vault"],
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
            Provenance fingerprint
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Origin DNA™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Not all content begins where you first see it.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Reality Drift", chain.reality_drift],
            ["Origin Confidence", primary.provenance_confidence],
            ["Reality State", primary.reality_state],
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
            <h2 className="text-xl font-semibold">Original Source</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["Source", primary.source],
                ["Capture Type", primary.capture_type],
                ["Upload Device", primary.upload_device],
                ["File Hash", primary.file_hash],
                ["Compression", primary.compression_signature],
                ["First Seen", new Date(primary.first_seen).toLocaleString()],
                ["Last Seen", new Date(primary.last_seen).toLocaleString()],
                ["Model Fingerprint", primary.ai_model_fingerprint ?? "none"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                    {label}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Synthetic Indicators</h2>
            <div className="mt-5 space-y-3">
              {[
                ["Voice clone probability", primary.voice_clone_probability],
                ["Video synthetic probability", primary.video_synthetic_probability],
                ["Image synthetic probability", primary.image_synthetic_probability],
                ["Generation count", primary.generation_count],
                ["Edited count", primary.edited_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-zinc-400">{label}</p>
                    <p className="font-semibold text-zinc-100">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {chainSections.map(({ title, values }) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <div className="mt-5 space-y-3">
                {values.map((value, index) => (
                  <div
                    key={`${title}-${value}-${index}`}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Origin Confidence</h2>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${confidenceClass(
                primary.provenance_confidence
              )}`}
            >
              {primary.provenance_confidence}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Human Presence impact</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              {chain.human_presence_impact}
            </p>
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
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Reality States</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {realityStates.map((state) => (
                <code key={state} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                  {state}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals / Audit</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {[...originDNASignals, ...originDNAAuditEvents, ...transformationEvents.slice(0, 4)].map((item) => (
                <code key={item} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
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
