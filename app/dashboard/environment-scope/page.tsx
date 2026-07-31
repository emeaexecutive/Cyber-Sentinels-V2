import { EnvironmentScopePanel } from "@/src/components/scope-continuity/EnvironmentScopePanel";
import { consistentContextScenario, criticalContradictionScenario } from "@/src/lib/scope-continuity/scenarios";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";

export const dynamic = "force-dynamic";

export default async function EnvironmentScopePage() {
  const { workspace } = await trustArchitectureUiContext("/dashboard/environment-scope");
  if (!workspace) return <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">Enterprise workspace required.</main>;
  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl"><EnvironmentScopePanel critical={criticalContradictionScenario()} consistent={consistentContextScenario()} /></div>
    </main>
  );
}
