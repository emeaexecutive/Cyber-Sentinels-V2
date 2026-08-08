import { EnterpriseTrustCentre } from "@/src/components/trust-centre/EnterpriseTrustCentre";
import { buildContinuousOperationalTrustScenario } from "@/lib/trust-intelligence";
import { enterpriseTrustCentreRepository } from "@/src/lib/trust-centre/repository";
import { trustCentreUiContext } from "@/src/lib/trust-centre/ui-context";

export const dynamic = "force-dynamic";

export default async function EnterpriseTrustCentrePage() {
  const { workspace, role } = await trustCentreUiContext();
  if (!workspace || !role) {
    return (
      <main className="min-h-screen bg-[#05080d] px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
          <h1 className="text-2xl font-semibold">Enterprise workspace required</h1>
          <p className="mt-3 text-amber-100/80">
            Join or create a trust workspace before opening the Enterprise Trust Centre.
          </p>
        </div>
      </main>
    );
  }
  const snapshot = await enterpriseTrustCentreRepository().snapshot(
    workspace.id,
    workspace.name ?? "Enterprise workspace",
    role,
    100
  );
  const operationalIntelligence = buildContinuousOperationalTrustScenario();
  return (
    <main className="min-h-screen bg-[#05080d] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <EnterpriseTrustCentre initialSnapshot={snapshot} operationalIntelligence={operationalIntelligence} />
      </div>
    </main>
  );
}
