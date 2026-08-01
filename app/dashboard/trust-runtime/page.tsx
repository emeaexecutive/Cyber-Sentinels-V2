import { ContinuousTrustDashboard } from "@/src/components/continuous-trust/ContinuousTrustDashboard";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";
import { continuousTrustSignalRepository } from "@/src/lib/continuous-trust/signal-repository";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContinuousTrustRuntimePage() {
  const { workspace } = await trustArchitectureUiContext("/dashboard/trust-runtime");
  if (!workspace) {
    return (
      <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">
        Enterprise workspace required.
      </main>
    );
  }
  const runtimeRepository = continuousTrustRepository();
  const signalRepository = continuousTrustSignalRepository();
  const generatedAt = new Date().toISOString();
  const [runtimeRows, alerts, providers, evidenceRows, assessments, signals, reviews] =
    await Promise.all([
      runtimeRepository.listRuntime(workspace.id, 100),
      runtimeRepository.alerts(workspace.id, 100),
      runtimeRepository.providerHealth(workspace.id, 100),
      runtimeRepository.listEvidence(workspace.id, null, 100),
      runtimeRepository.recentAssessments(workspace.id, 50),
      signalRepository.recentSignals(workspace.id, 50),
      signalRepository.reviews(workspace.id, null, 50),
    ]);
  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
            Continuous Trust Engine™
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Operational trust as conditions change
          </h1>
          <p className="mt-4 max-w-4xl leading-7 text-zinc-400">
            Live state, normalized signals, drift, evidence, alerts, provider health,
            and accountable manual review derive from tenant-scoped production records.
            Missing measurements remain explicit.
          </p>
          <Link href="/dashboard/environment-scope" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 underline underline-offset-4">
            Review Environment Attestation and Scope Continuity™
          </Link>
        </header>
        <ContinuousTrustDashboard
          initialRuntime={runtimeRows.slice(0, 100)}
          initialAlerts={alerts}
          initialProviders={providers}
          initialEvidence={evidenceRows.slice(0, 100)}
          initialAssessments={assessments}
          initialSignals={signals}
          initialReviews={reviews}
          generatedAt={generatedAt}
        />
      </div>
    </main>
  );
}
