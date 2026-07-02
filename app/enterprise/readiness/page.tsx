import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { buildEnterpriseReadinessModel } from "@/lib/enterprise-readiness";
import { getVerificationProviderRegistry } from "@/lib/providers";
import { createReadinessGateSnapshot } from "@/lib/readiness-gate/snapshot";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enterprise Readiness | Cyber Sentinels",
  description:
    "Deployment safeguards, operational trust posture and evidence-backed enterprise readiness.",
};

const stateStyle = {
  ready: "border-emerald-900/70 bg-emerald-950/20 text-emerald-200",
  caution: "border-amber-900/70 bg-amber-950/20 text-amber-200",
  blocked: "border-rose-900/70 bg-rose-950/20 text-rose-200",
};

export default async function EnterpriseReadinessPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/enterprise/readiness" });

  const snapshot = await createReadinessGateSnapshot(supabase);
  const model = buildEnterpriseReadinessModel(
    snapshot,
    getVerificationProviderRegistry()
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Enterprise Readiness Center
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-4xl font-semibold md:text-6xl">
                Deployment readiness, grounded in evidence.
              </h1>
              <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-200">
                Inspect operational trust posture, governance safeguards, replay
                auditability and provider configuration before an enterprise
                workflow moves into a controlled pilot.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-5 lg:min-w-64">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                Evidence checks ready
              </p>
              <p className="mt-2 text-4xl font-semibold text-cyan-100">
                {model.readinessPercent}%
              </p>
              <p className="mt-2 text-sm text-zinc-400">{model.status}</p>
            </div>
          </div>
          <p className="mt-6 rounded-lg border border-zinc-800 bg-black/70 p-4 text-sm leading-6 text-zinc-400">
            {model.summary} A ready gate supports controlled design-partner
            evaluation; it does not assert production certification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/readiness-gate" className="brand-primary-action brand-action-large text-sm">
              Inspect Readiness Gate
            </Link>
            <Link href="/admin/runtime-validation" className="brand-secondary-action brand-action-large text-sm">
              Runtime Validation
            </Link>
            <Link href="/enterprise/compliance" className="brand-secondary-action brand-action-large text-sm">
              Compliance Readiness
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Deployment safeguards
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Controls with visible evidence and limitations.
            </h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.safeguards.map((item) => (
              <article key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{item.label}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${stateStyle[item.state]}`}>
                    {item.state}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{item.evidence}</p>
                <p className="mt-3 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">
                  Boundary: {item.limitation}
                </p>
              </article>
            ))}
          </div>
        </section>

        {(model.blockers.length || model.cautions.length) ? (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Open deployment items</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[...model.blockers, ...model.cautions].map((item) => (
                <div key={item.label} className={`rounded-lg border p-4 ${stateStyle[item.state]}`}>
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 opacity-80">{item.message}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Operational transparency
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.transparencyClasses.map((group) => (
              <article key={group.label} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-lg font-semibold text-zinc-100">{group.label}</h2>
                <ul className="mt-4 grid gap-2 text-sm text-zinc-300">
                  {(group.items.length ? group.items : ["No configured items"]).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-cyan-300">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">
                  {group.boundary}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Provider orchestration
              </p>
              <h2 className="mt-3 text-3xl font-semibold">Configuration is shown without implied certainty.</h2>
            </div>
            <Link href="/admin/integrations" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
              Manage integrations →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.providerStatus.map((provider) => (
              <article key={provider.name} className="rounded-lg border border-zinc-800 bg-black p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{provider.name}</h3>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] uppercase text-zinc-400">
                    {provider.runtimeState}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">{provider.evidence}</p>
                <div className="mt-4 grid gap-1 text-xs text-zinc-500">
                  <p>Replay: {provider.replayIntegration.replaceAll("_", " ")}</p>
                  <p>Receipt: {provider.receiptIntegration.replaceAll("_", " ")}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-cyan-950/10 p-5">
          <p className="max-w-5xl text-sm leading-7 text-zinc-300">
            {model.complianceBoundary}
          </p>
        </section>
      </div>
    </main>
  );
}
