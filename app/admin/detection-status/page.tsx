import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";
import { detectionProviders } from "@/lib/detection/providers";
import { providerStatusLabel } from "@/lib/detection/providers";
import { runValidationBenchmark } from "@/lib/validation/benchmark-harness";

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
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">ML Capability Level</p>
          <p className="mt-3 text-xl font-semibold text-zinc-100">Level 2 — Provider-ready foundation</p>
          <p className="mt-2 text-sm text-zinc-500">Target: provider-backed and benchmark validated. The baseline is explainable scoring, not trained ML.</p>
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
            <p className="mt-3 text-sm text-zinc-400">Precision: {benchmark.metrics.precision ?? "Unavailable"} · Recall: {benchmark.metrics.recall ?? "Unavailable"} · F1: {benchmark.metrics.f1 ?? "Unavailable"}</p>
            <p className="mt-2 text-xs text-zinc-500">Reviewer agreement: {benchmark.reviewerAgreement.agreementRate ?? "Unavailable"} · Provider agreement: {benchmark.providerAgreement ?? "Unavailable"}</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-zinc-100">Confusion Matrix</h2>
            <p className="mt-3 text-sm text-zinc-400">TP {benchmark.confusionMatrix.truePositives} · FP {benchmark.confusionMatrix.falsePositives} · TN {benchmark.confusionMatrix.trueNegatives} · FN {benchmark.confusionMatrix.falseNegatives}</p>
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
