import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";

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
  const cards = [
    ["Real ML", status.real_ml_enabled, status.real_ml_enabled ? "Active" : "Inactive"],
    ["Provider Detection APIs", status.provider_detection_enabled, status.provider_detection_enabled ? "Active" : "Inactive"],
    ["Heuristic Rules", status.heuristic_detection_enabled, status.heuristic_detection_enabled ? "Active" : "Inactive"],
    ["Demo Data", status.mock_data_present, status.mock_data_present ? "Present" : "Not Present"],
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

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {cards.map(([label, active, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
              <p className={`mt-3 text-xl font-semibold ${active ? "text-emerald-200" : "text-amber-200"}`}>{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Trust Score Source</p>
          <p className="mt-3 text-xl font-semibold text-zinc-100">{status.trust_score_source}</p>
          <p className="mt-2 text-sm text-zinc-500">Deterministic workflow rules and normalized provider evidence; not proprietary ML.</p>
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
