import type { Metadata } from "next";
import Link from "next/link";
import { EvidenceCard, ProviderCard, Timeline, TrustFlow, VisualFrame } from "@/components/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";
import { mlValidationEngine } from "@/lib/core/ml-validation-engine";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";

const operationalTrustGraph = [
  { label: "Identity" },
  { label: "Authority" },
  { label: "Context" },
  { label: "Action" },
  { label: "Evidence" },
  { label: "Replay" },
  { label: "Trust Memory™" },
  { label: "Continuous Trust" },
];

const memoryTimeline = [
  { label: "High Trust", detail: "Current evidence supports the action." },
  { label: "Risk Detected", detail: "Runtime context changes materially." },
  { label: "Authority Updated", detail: "Scope narrows before execution." },
  { label: "Replay", detail: "The chronology remains reconstructable." },
  { label: "Review", detail: "A named owner evaluates the evidence." },
  { label: "Trust Restored", detail: "Governed evidence resolves the challenge." },
  { label: "Current Trust", detail: "The latest posture retains its history." },
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
  const validationStatus = [
    ["Real ML", detection.real_ml_enabled ? "Active and verified" : "Not implemented", detection.real_ml_enabled ? "Measured" : "Awaiting validation"],
    ["Provider-backed detection", detection.provider_detection_enabled ? "Active" : "Awaiting credentials", "Provider supplied"],
    ["Heuristic baseline", detection.heuristic_detection_enabled ? "Active - deterministic rules" : "Disabled", "Estimated"],
    ["Precision", metricStatus(calibrationComplete && benchmark?.metrics.precision !== null), calibrationComplete ? "Measured" : "Awaiting validation"],
    ["Recall", metricStatus(calibrationComplete && benchmark?.metrics.recall !== null), calibrationComplete ? "Measured" : "Awaiting validation"],
    ["Reviewed outcomes", reviewedOutcomeCount ? String(reviewedOutcomeCount) : "Awaiting data", reviewedOutcomeCount ? "Human reviewed" : "Awaiting validation"],
  ];

  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Trust Center"
          title="Inspect the proof, chronology and limitations behind operational trust."
          bullets={["Replay reconstructs what happened.", "Trust Memory™ shows how trust changed.", "Provider states and limitations stay explicit.", "Validation claims require reviewed evidence."]}
          primary={{ href: "/enterprise-access?intent=trust-team", label: "Talk to Trust Team" }}
        />

        <section id="trust-posture" className="mt-8 scroll-mt-28 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Trust Posture</p>
          <h2 className="mt-3 text-2xl font-semibold">A workflow-specific operational state, not a universal score.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Current evidence freshness, authority, runtime risk and governance determine the posture. Unknown evidence remains unknown.</p>
        </section>

        <section id="living-trust-profile" className="mt-8 scroll-mt-28 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Living Trust Profile</p>
          <h2 className="mt-3 text-2xl font-semibold">Current operational posture, derived for one defined context.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">The profile derives identity, authority lineage, credentials, provider evidence, runtime context, Evidence Graph, Replay, Trust Memory™, reviewed outcomes, governance and policy. It is not a universal reputation score.</p>
          <div id="trust-dna" className="mt-6 scroll-mt-28 rounded-xl border border-cyan-900/70 bg-cyan-950/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Trust DNA™</p>
            <p className="mt-3 max-w-3xl text-lg font-semibold text-white">Trust DNA™ shows how operational trust has evolved within a defined organization, workflow, purpose and assessment period.</p>
            <p className="mt-3 text-sm font-medium text-cyan-100">Valid for this organization, workflow, purpose and assessment time.</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Trust DNA assurance dimensions">
              {["Identity assurance", "Authority assurance", "Credential assurance", "Runtime integrity", "Evidence quality", "Behavioural consistency", "Governance status", "Decision confidence"].map((item) => <li key={item} className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">{item}</li>)}
            </ul>
          </div>
        </section>

        <section id="operational-trust-graph" className="mt-8 scroll-mt-28">
          <VisualFrame eyebrow="Operational Trust Graph™" title="Operational trust connected over time." caption="Evidence Graph stores relationships. Operational Trust Graph™ connects identity, authority, action and evolving trust across the decision chronology.">
            <TrustFlow steps={operationalTrustGraph} ariaLabel="Operational Trust Graph" />
          </VisualFrame>
          <div id="evidence-audit" className="mt-4 grid scroll-mt-28 gap-4 md:grid-cols-3">
            <EvidenceCard label="Evidence Graph" state="Relationship continuity" detail="Actors, authority, providers, decisions and outcomes remain linked." />
            <EvidenceCard label="Replay" state="Chronology continuity" detail="Material state changes remain reconstructable and attributable." />
            <EvidenceCard label="Governance" state="Review continuity" detail="Owner, rationale, action and escalation remain visible." />
          </div>
          <Link href="/verification-replay" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Open Replay →</Link>
        </section>

        <section id="trust-memory" className="mt-8 scroll-mt-28">
          <VisualFrame eyebrow="Trust Memory™" title="Trust evolves; its history remains explainable." caption="Every change records why, by whom, with which evidence, policy and authority.">
            <Timeline events={memoryTimeline} ariaLabel="Trust Memory evolution timeline" />
          </VisualFrame>
        </section>

        <section id="provider-transparency" className="mt-8 scroll-mt-28 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Provider Transparency</p>
          <h2 className="mt-3 text-2xl font-semibold">Provider evidence without hidden status or blind consensus.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <ProviderCard label="Configured providers" state={detection.provider_detection_enabled ? "Active" : "Awaiting credentials"} detail="Live requires configuration and a successful health check." />
            <ProviderCard label="Missing configuration" state={`${detection.missing_providers.length} provider configuration(s)`} detail="Unavailable providers do not contribute confidence." />
            <ProviderCard label="Consensus boundary" state="Explainable contributions" detail="Source, model, version, latency and limitations remain distinct." />
          </div>
        </section>

        <section id="ml-validation" className="mt-8 scroll-mt-28 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Validation</p>
          <h2 className="mt-3 text-2xl font-semibold">Measured capability without inflated accuracy claims.</h2>
          <p className="mt-3 text-sm text-zinc-400">{calibrationComplete ? "Dataset-scoped calibration is available and remains subject to review." : "Calibration incomplete - insufficient reviewed ground truth."}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {validationStatus.map(([label, state, detail]) => (
              <EvidenceCard key={label} label={label} state={state} detail={detail} />
            ))}
          </div>
          <p className="mt-5 text-sm text-zinc-400">Dataset status: {caseCount ? `${caseCount} labelled case(s)` : "Awaiting data"}. ML contributes evidence; it does not independently define truth or override policy.</p>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">AI & Data Sovereignty</p>
          <h2 className="mt-3 text-2xl font-semibold">Customer policy governs data, memory and provider boundaries.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Deployment region, retention, restricted-data handling and provider routing are verified per deployment. No hosting or sovereignty guarantee is inferred from configuration alone.</p>
          <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold">
            <Link href="/trust/data-sovereignty" className="text-cyan-200 hover:text-white">Review sovereignty boundaries →</Link>
            <Link href="/documents/operational-trust-whitepaper" className="text-cyan-200 hover:text-white">Read the technical architecture →</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Trust Center | Cyber Sentinels",
  description: "Public assurance for Replay, Trust Memory, evidence, provider transparency, validation, sovereignty and the Operational Trust Graph.",
  alternates: { canonical: "/trust" },
};
