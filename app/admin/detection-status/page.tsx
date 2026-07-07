import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";
import { detectionProviders } from "@/lib/detection/providers";
import { providerStatusLabel } from "@/lib/detection/providers";
import { runValidationBenchmark } from "@/lib/validation/benchmark-harness";
import { evaluateMlReadiness, mlReadinessLevels } from "@/lib/validation/ml-readiness";

export const dynamic = "force-dynamic";

export default async function DetectionStatusAdminPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/detection-status");
    redirect("/back-office?denied=1");
  }
  await requireAdminPageAccess(supabase, { path: "/admin/detection-status" });
  const status = getDetectionEngineStatus();
  const benchmark = await runValidationBenchmark();
  const providerStates = detectionProviders.map((provider) => ({
    name: provider.providerName,
    status: provider.status(),
    displayStatus: providerStatusLabel(provider.status()),
    signals: provider.supportedSignals.join(", "),
  }));
  const scorecard = [
    ["Real ML inference", status.real_ml_enabled ? "Active" : "Inactive"],
    ["Provider ML detection", status.provider_detection_enabled ? "Active" : "Awaiting Credentials"],
    ["Heuristic detection", status.heuristic_detection_enabled ? "Active" : "Inactive"],
    ["Demo/mock scoring", status.mock_data_present ? "Present" : "Absent"],
    ["Validation dataset", benchmark.caseCount ? "Present" : "Missing"],
    ["Precision / recall", benchmark.caseCount ? "Available on run" : "Missing"],
    ["False positive tracking", status.false_positive_tracking_present ? "Present" : "Missing"],
    ["False negative tracking", status.false_negative_tracking_present ? "Present" : "Missing"],
  ] as const;
  const mlReadiness = evaluateMlReadiness({
    realMlActive: status.real_ml_enabled,
    providerDetectionActive: status.provider_detection_enabled,
    validationDatasetPresent: benchmark.caseCount > 0,
    precisionAvailable: benchmark.metrics.precision !== null,
    recallAvailable: benchmark.metrics.recall !== null,
    f1Available: benchmark.metrics.f1 !== null,
    falsePositiveTracking: status.false_positive_tracking_present,
    falseNegativeTracking: status.false_negative_tracking_present,
    humanReviewEnabled: true,
    enterprisePilotValidated: false,
    proprietaryModelBenchmarked: false,
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <h1 className="mt-4 text-4xl font-semibold">Detection Engine Status</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Operational inventory of implemented rules, provider-backed checks,
            placeholders and missing capability. Credentials never substitute
            for an implemented adapter or validated inference.
          </p>
          <p className="mt-5 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">
            No confirmed ML detection unless a verified model/provider exists.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-100">ML Strength Scorecard</h2>
          <p className="mt-2 text-sm text-zinc-500">Implementation and validation readiness; no accuracy is inferred from these states.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {scorecard.map(([label, value]) => (
              <article key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                <p className={`mt-3 text-xl font-semibold ${["Active", "Present"].includes(value) ? "text-emerald-200" : "text-amber-200"}`}>{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">ML Completion Readiness</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-500">Current platform level</p>
              <p className="mt-3 text-4xl font-semibold text-cyan-100">Level {mlReadiness.current_level}</p>
              <p className="mt-2 text-lg font-medium text-zinc-100">{mlReadiness.current_label}</p>
              <p className="mt-4 text-sm leading-7 text-zinc-500">
                {mlReadiness.target_65_80_maturity}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Works today", "Heuristic Baseline, Runtime Intelligence, source-labelled provider readiness, replay evidence and human review."],
                ["Heuristic", "Session integrity, provenance confidence, intent risk and signal fusion remain deterministic review aids."],
                ["Provider-backed", status.provider_detection_enabled ? "Provider-backed detection is active." : "No media/document provider inference is active yet."],
                ["Not implemented", "Production-grade first-party ML detection and proprietary model benchmarks are not claimed."],
                ["Missing data", benchmark.caseCount ? `${benchmark.caseCount} labelled case(s) available.` : "No validation dataset available yet."],
                ["65-80% maturity", "Needs labelled datasets, source-specific precision/recall/F1, reviewed false positives/negatives and enterprise pilot evidence."],
              ].map(([label, copy]) => (
                <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm font-semibold text-zinc-100">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-4">
            {mlReadinessLevels.map((level) => (
              <div
                key={level.level}
                className={`rounded-lg border p-3 ${level.level <= mlReadiness.current_level ? "border-cyan-900 bg-cyan-950/20" : "border-zinc-800 bg-black"}`}
              >
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Level {level.level}</p>
                <p className="mt-1 text-sm font-medium text-zinc-100">{level.title}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-amber-900 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-100">Blockers to next level</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-100">
              {mlReadiness.blockers_to_next_level.slice(0, 4).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">ML Capability Level</p>
          <p className="mt-3 text-xl font-semibold text-zinc-100">
            Level {benchmark.benchmarkMaturity.level} - {benchmark.benchmarkMaturity.label}
          </p>
          <p className="mt-2 text-sm text-zinc-500">Target: provider-backed and benchmark validated. The baseline is explainable scoring, not trained ML.</p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Detection truth labels</p>
          <h2 className="mt-3 text-xl font-semibold text-zinc-100">Source taxonomy and boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            These are the only allowed labels for ML and detection surfaces. Provider state is tracked separately as Live, Simulated, Awaiting Credentials, Timeout, Failed or Disabled.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {status.source_taxonomy.map((item) => (
              <article key={item.source} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-100">{item.source}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{item.boundary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Trust Score Source</p>
          <p className="mt-3 text-xl font-semibold text-zinc-100">{status.trust_score_source}</p>
          <p className="mt-2 text-sm text-zinc-500">Confidence: {Math.round(status.trust_score_explanation.confidence * 100)}%. Evidence: {status.trust_score_explanation.evidence.join(", ")}.</p>
          <p className="mt-2 text-sm text-amber-200">{status.trust_score_explanation.limitations.join(" ")}</p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Validation Dataset Status</h2>
            <p className="mt-3 text-sm text-zinc-400">{benchmark.caseCount} labelled cases</p>
            {!benchmark.caseCount && <p className="mt-2 text-sm text-amber-200">{benchmark.message}</p>}
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Precision / Recall Metrics</h2>
            <p className="mt-3 text-sm text-zinc-400">Precision: {benchmark.metrics.precision ?? "Unavailable"} / Recall: {benchmark.metrics.recall ?? "Unavailable"} / F1: {benchmark.metrics.f1 ?? "Unavailable"}</p>
            <p className="mt-2 text-xs text-zinc-500">Reviewer agreement: {benchmark.reviewerAgreement.agreementRate ?? "Unavailable"} / Provider agreement: {benchmark.providerAgreement ?? "Unavailable"}</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Confusion Matrix</h2>
            <p className="mt-3 text-sm text-zinc-400">TP {benchmark.confusionMatrix.truePositives} / FP {benchmark.confusionMatrix.falsePositives} / TN {benchmark.confusionMatrix.trueNegatives} / FN {benchmark.confusionMatrix.falseNegatives}</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Detection Source Coverage</h2>
            <p className="mt-3 text-sm text-zinc-400">{benchmark.detectionSourcesUsed.join(", ") || "No benchmark sources executed"}</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Missing Provider Credentials</h2>
            <p className="mt-3 text-sm text-zinc-400">{providerStates.filter((provider) => provider.status === "awaiting_credentials").map((provider) => provider.name).join(", ") || "None"}</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Next Actions</h2>
            <p className="mt-3 text-sm text-zinc-400">Add approved labelled cases, implement one reviewed provider endpoint, then calibrate thresholds.</p>
          </article>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Runtime Intelligence</p>
          <h2 className="mt-3 text-xl font-semibold text-zinc-100">Replay, fusion and calibration coverage</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Runtime replay validation", benchmark.benchmarkMaturity.runtimeReplayValidation],
              ["Signal-fusion comparison", benchmark.benchmarkMaturity.signalFusionComparison],
              ["Confidence calibration", benchmark.benchmarkMaturity.confidenceCalibration],
              ["Trust drift tracking", benchmark.benchmarkMaturity.trustDriftTracking],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{value.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-zinc-800 pt-4 text-xs leading-6 text-zinc-500">
            {benchmark.benchmarkMaturity.boundary}
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="font-semibold text-zinc-100">Provider Detection Status</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {providerStates.map((provider) => (
              <div key={provider.name} className="rounded border border-zinc-800 p-3 text-sm">
                <p className="text-zinc-200">{provider.name} · {provider.displayStatus}</p>
                <p className="mt-1 text-zinc-500">{provider.signals}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr><th className="px-4 py-3">Capability</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Implementation</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Boundary</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-black">
                {status.detection_modules.map((module) => (
                  <tr key={module.id}>
                    <td className="px-4 py-4 font-medium text-zinc-100">{module.name}</td>
                    <td className="px-4 py-4 text-zinc-300">{module.status}</td>
                    <td className="px-4 py-4 text-zinc-400">{module.implementation_type}</td>
                    <td className="px-4 py-4 text-zinc-400">{module.source}</td>
                    <td className="max-w-md px-4 py-4 text-zinc-500">{module.warning ?? "Human governance remains authoritative."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {status.providers.map((provider) => (
            <article key={provider.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="font-semibold text-zinc-100">{provider.name}</h2><p className="mt-1 text-xs text-zinc-500">{provider.module.replaceAll("_", " ")}</p></div>
                <span className="text-xs font-medium text-zinc-300">{provider.runtime_state}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Adapter {provider.adapter_implemented ? "implemented" : "not implemented"}.
                {provider.missing_env.length ? ` Missing: ${provider.missing_env.join(", ")}.` : " Required credentials present."}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
