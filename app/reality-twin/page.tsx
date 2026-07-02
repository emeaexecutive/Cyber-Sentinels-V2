import Link from "next/link";
import { demoRealityTwin, demoRealityTwinAnalysis } from "@/lib/trust-engine/realityTwin";

function riskClass(value: string) {
  if (value === "high" || value === "critical") return "border-red-700 text-red-200";
  if (value === "elevated" || value === "watch") {
    return "border-amber-700 text-amber-200";
  }

  return "border-emerald-700 text-emerald-200";
}

export default function RealityTwinPage() {
  const result = demoRealityTwinAnalysis;
  const sections = [
    ["Exposure Surface", `Public interviews: ${demoRealityTwin.public_interviews}`],
    ["Reality Resilience", result.reality_resilience],
    ["Clone Risk", result.clone_risk],
    ["Public Signal Density", demoRealityTwin.inputs.social_signal_density],
    ["Evidence Strength", demoRealityTwin.evidence_strength],
    ["Behavioral Stability", demoRealityTwin.inputs.behavior_pattern],
    ["Synthetic Probability", result.impersonation_probability],
    ["Recommended Actions", result.recommendations.join(", ")],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/synthetic-counterpart", "Identity Duplication Risk"],
            ["/human-presence-genome", "Presence Evidence"],
            ["/origin-dna", "Identity Provenance"],
            ["/reality-chain", "Evidence Chain"],
            ["/trust-timeline", "Replay Timeline"],
            ["/trust-graph", "Authorization Lineage"],
            ["/trust-center", "Trust Center"],
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
            Synthetic resilience model
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Identity Exposure Review
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Review identity exposure, evidence strength and impersonation risk
            as bounded inputs to Trust Posture and Governance Review.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Synthetic Clone Risk", result.clone_risk],
            ["Reality Resilience", result.reality_resilience],
            ["Identity Exposure", result.identity_exposure],
            ["Clone Complexity", result.clone_complexity],
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">{demoRealityTwin.subject_name}</h2>
            <p className="mt-3 text-sm capitalize text-zinc-500">
              {demoRealityTwin.subject_type}
            </p>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${riskClass(
                result.clone_risk
              )}`}
            >
              Synthetic Clone Risk: {result.clone_risk}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Exposure Surface</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Public interviews", demoRealityTwin.public_interviews],
                ["Voice exposure", demoRealityTwin.voice_exposure],
                ["Video exposure", demoRealityTwin.video_exposure],
                ["Evidence strength", demoRealityTwin.evidence_strength],
                ["Media exposure", demoRealityTwin.inputs.media_exposure],
                ["Agent activity", demoRealityTwin.inputs.agent_activity],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-semibold capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sections.map(([title, value]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400 capitalize">
                {value}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
