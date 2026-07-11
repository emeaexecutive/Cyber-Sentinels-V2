import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { mlValidationEngine } from "@/lib/core/ml-validation-engine";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";

const trustPrinciples = [
  ["Evidence before outcome", "Trust Posture is supported by inspectable evidence, not a hidden verdict."],
  ["Replayable memory", "Material trust changes remain reconstructable after the runtime moment has passed."],
  ["Human governance", "Sensitive workflow changes remain reviewable, attributable and reversible where appropriate."],
  ["Provider transparency", "Live, Simulated, Awaiting Credentials, Disabled and Not Implemented remain distinct states."],
];

const mlDoes = [
  "Detects or scores signals",
  "Compares patterns",
  "Contributes confidence",
  "Supports anomaly detection",
];

const mlDoesNot = [
  "Independently define truth",
  "Override governance",
  "Guarantee authenticity",
  "Replace policy enforcement",
];

function metricStatus(ready: boolean) {
  return ready ? "Computed from reviewed data" : "Awaiting data";
}

export default async function TrustPage() {
  const detection = getDetectionEngineStatus();
  const validation = await mlValidationEngine.runMlValidationEngine().catch(() => null);
  const benchmark = validation?.benchmark ?? null;
  const calibrationComplete = benchmark?.calibrationStatus.complete ?? false;
  const caseCount = benchmark?.caseCount ?? 0;
  const reviewedOutcomeCount = benchmark?.reviewedOutcomeSummary.reviewed ?? 0;
  const mlStatus = [
    ["Real ML", detection.real_ml_enabled ? "Active and verified" : "Not implemented", detection.real_ml_enabled ? "Measured" : "Awaiting validation"],
    ["Provider-backed detection", detection.provider_detection_enabled ? "Active" : "Awaiting credentials", "Provider supplied"],
    ["Heuristic baseline", detection.heuristic_detection_enabled ? "Active - deterministic rules" : "Disabled", "Estimated"],
    ["Runtime intelligence", detection.runtime_intelligence_enabled ? "Active - governed context" : "Disabled", "Estimated"],
    ["Validation dataset status", caseCount ? `${caseCount} labelled case(s)` : "Awaiting data", caseCount ? "Measured" : "Awaiting validation"],
    ["Precision status", metricStatus(calibrationComplete && benchmark?.metrics.precision !== null), calibrationComplete ? "Measured" : "Awaiting validation"],
    ["Recall status", metricStatus(calibrationComplete && benchmark?.metrics.recall !== null), calibrationComplete ? "Measured" : "Awaiting validation"],
    ["F1 status", metricStatus(calibrationComplete && benchmark?.metrics.f1 !== null), calibrationComplete ? "Measured" : "Awaiting validation"],
    ["Reviewed outcomes", reviewedOutcomeCount ? String(reviewedOutcomeCount) : "Awaiting data", reviewedOutcomeCount ? "Human reviewed" : "Awaiting validation"],
    ["Calibration status", calibrationComplete ? "Dataset-scoped; ongoing review required" : "Validation incomplete - insufficient reviewed dataset.", calibrationComplete ? "Human reviewed" : "Awaiting validation"],
    ["Awaiting credentials", `${detection.missing_providers.length} provider configuration(s)`, "Provider supplied"],
    ["Not implemented", `${detection.detection_modules.filter((module) => module.status === "Not Implemented").length} detection module(s)`, "Awaiting validation"],
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Trust Center"
          title="Understand the evidence, ownership and confidence behind every trust decision."
          bullets={["See whether evidence is measured, estimated, provider supplied or awaiting validation.", "Know which human owner reviewed or must act next.", "Trace changes through Replay and Trust Memory\u2122.", "Prove the outcome without exposing protected customer records."]}
          primary={{ href: "/enterprise-access?intent=trust-team", label: "Talk to Trust Team" }}
          secondary={{ href: "/trust-principles", label: "Read Trust Framework" }}
        />

        <section id="trust-posture" className="mt-8 scroll-mt-28 rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Trust Posture</p>
          <h2 className="mt-3 text-2xl font-semibold">An explainable operational state, not a universal score.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Trust Posture reflects current evidence freshness, authorization state, runtime risk and governance outcomes for a specific workflow. Protected posture dashboards expose customer records only to authorized users.
          </p>
        </section>

        <section id="trust-memory" className="mt-8 scroll-mt-28 rounded-lg border border-cyan-950 bg-[linear-gradient(145deg,rgba(8,47,73,0.16),rgba(9,9,11,0.98)_55%)] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Trust Memory\u2122</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold">Trust that remains understandable as outcomes accumulate.</h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-zinc-200">
            Replay shows what happened. Trust Memory\u2122 shows how trust evolved and how reviewed outcomes improve future decisions.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            It connects evidence, authority, trust-state transitions, reviewer rationale and governed outcomes without claiming autonomous learning or certainty.
          </p>
          <p className="mt-4 text-sm font-medium text-cyan-200">Trust Memory\u2122 is a Cyber Sentinels product concept.</p>
          <Link href="/verification-replay" className="mt-6 inline-flex brand-secondary-action">Explore Replay</Link>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article id="evidence-audit" className="scroll-mt-28 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Evidence & Audit</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Evidence references, provider state, policy context, reviewer actions and receipts remain connected to the decision chronology.</p>
          </article>
          <article id="provenance" className="scroll-mt-28 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Provenance</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Source, time, actor and transformation context make evidence traceable without turning provenance into an authenticity guarantee.</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Governance</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Named review, escalation and enforcement rationale remain attributable before sensitive work advances.</p>
            <Link href="/governance" className="mt-4 inline-flex text-sm text-cyan-200 hover:text-white">Governance model</Link>
          </article>
        </section>

        <section id="ml-validation" className="mt-8 scroll-mt-28 rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">ML & Validation Transparency</p>
          <h2 className="mt-3 text-3xl font-semibold">Capability status without inflated accuracy claims.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300">
            ML contributes evidence. Cyber Sentinels combines evidence, policy, authority, runtime context and governance before making a trust decision.
          </p>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="ML evidence classes">
            {["Measured", "Estimated", "Awaiting validation", "Provider supplied", "Human reviewed"].map((classification) => (
              <span key={classification} className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-cyan-200">
                {classification}
              </span>
            ))}
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mlStatus.map(([label, state, classification]) => (
              <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{state}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">{classification}</p>
              </article>
            ))}
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold">What ML does</h3>
              <ul className="mt-4 grid gap-2 text-sm text-zinc-400">
                {mlDoes.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </article>
            <article className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold">What ML does not do</h3>
              <ul className="mt-4 grid gap-2 text-sm text-zinc-400">
                {mlDoesNot.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Operating principles</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {trustPrinciples.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/trust/data-sovereignty" className="brand-secondary-action">Data & AI Sovereignty</Link>
          <Link href="/platform" className="brand-secondary-action">Platform Architecture</Link>
          <Link href="/enterprise-access" className="brand-primary-action">Discuss Enterprise Controls</Link>
        </div>
      </div>
    </main>
  );
}
