import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { buildPlatformHealth } from "@/lib/core/platform-health";
import {
  buildEnterpriseOperationsSnapshot,
  designPartnerOperationalFlow,
  enterpriseControlCatalog,
  enterpriseLifecycleCatalog,
  securityReviewCatalog,
} from "@/lib/enterprise-operations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enterprise Operations | Cyber Sentinels",
  description: "Protected RC2 operational readiness and enterprise control ownership.",
};

const stateStyle = {
  HEALTHY: "border-emerald-800 bg-emerald-950/20 text-emerald-200",
  DEGRADED: "border-amber-800 bg-amber-950/20 text-amber-200",
  BLOCKED: "border-rose-800 bg-rose-950/20 text-rose-200",
  UNKNOWN: "border-zinc-700 bg-zinc-900 text-zinc-300",
  MAINTENANCE: "border-cyan-800 bg-cyan-950/20 text-cyan-200",
};

function explicitMaintenanceMode() {
  const value = process.env.ENTERPRISE_MAINTENANCE_MODE?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export default async function EnterpriseOperationsPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/enterprise/operations", release: "RC2" });
  const health = buildPlatformHealth({ authConfigured: true, apiAvailable: true });
  const operations = buildEnterpriseOperationsSnapshot({
    platformHealth: health,
    correlationId: crypto.randomUUID(),
    maintenanceMode: explicitMaintenanceMode(),
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">RC2 / Enterprise Operational Readiness</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-4xl font-semibold md:text-6xl">One protected operating view for a controlled enterprise pilot.</h1>
              <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-300">This workspace projects existing tenant, policy, provider, audit, lifecycle and deployment owners. It introduces no parallel ledger and never treats missing telemetry as healthy.</p>
            </div>
            <div className={`rounded-xl border p-5 ${stateStyle[operations.overallState]}`}>
              <p className="text-xs uppercase tracking-[0.12em] opacity-70">Observed state</p>
              <p className="mt-2 text-3xl font-semibold">{operations.overallState}</p>
              <p className="mt-2 text-xs opacity-70">{operations.environment ?? "environment unavailable"}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise/readiness" className="brand-primary-action brand-action-large text-sm">Deployment readiness</Link>
            <Link href="/enterprise/auditability" className="brand-secondary-action brand-action-large text-sm">Auditability</Link>
            <Link href="/admin/provider-status" className="brand-secondary-action brand-action-large text-sm">Provider status</Link>
          </div>
          <p className="mt-6 rounded-lg border border-zinc-800 bg-black/60 p-4 text-xs leading-6 text-zinc-500">Release {operations.releaseVersion ?? "unavailable"} · Correlation {operations.correlationId} · Observed {operations.observedAt}. {operations.boundary}</p>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Operations</p>
          <h2 className="mt-3 text-3xl font-semibold">Health, work queues and recovery without false certainty.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {operations.controls.map((control) => (
              <article key={control.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{control.label}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${stateStyle[control.state]}`}>{control.state}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{control.evidence}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.1em] text-zinc-600">Source: {control.source.replaceAll("_", " ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Enterprise administration</p>
          <h2 className="mt-3 text-3xl font-semibold">Ten controls, each routed to its current owner.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enterpriseControlCatalog.map((control) => (
              <Link key={control.id} href={control.href} className="rounded-xl border border-zinc-800 bg-black/60 p-5 hover:border-cyan-900">
                <p className="font-semibold text-zinc-100">{control.label}</p>
                <p className="mt-2 text-sm text-cyan-200">Owner: {control.owner}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{control.boundary}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Lifecycle ownership</p>
            <div className="mt-4 grid gap-2">
              {enterpriseLifecycleCatalog.map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-black/60 p-3 text-sm hover:border-cyan-900">
                  <span className="font-semibold text-zinc-200">{item.label}</span><span className="text-right text-xs text-zinc-500">{item.owner}</span>
                </Link>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Security review</p>
            <div className="mt-4 grid gap-3">
              {securityReviewCatalog.map((item) => (
                <div key={item.control} className="rounded-lg border border-zinc-800 bg-black/60 p-3">
                  <div className="flex justify-between gap-3"><span className="font-semibold text-zinc-200">{item.control}</span><span className="text-right text-xs text-cyan-200">{item.owner}</span></div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{item.evidence}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Design Partner Mode</p>
          <h2 className="mt-3 text-3xl font-semibold">A nine-stage pilot with evidence at every handoff.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {designPartnerOperationalFlow.map((step, index) => (
              <Link key={step.stage} href={step.href} className="rounded-xl border border-zinc-800 bg-black/60 p-4 hover:border-cyan-900">
                <p className="text-xs text-cyan-200">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-semibold">{step.stage}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{step.evidence}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-cyan-950 bg-cyan-950/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Audit contract</p>
          <h2 className="mt-3 text-2xl font-semibold">Every material action must answer Who, When, Why, Evidence, Authority and Replay.</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">RC2 validates this contract in application code and records policy governance as append-only tenant evidence. An absent answer blocks approval rather than being inferred.</p>
        </section>
      </div>
    </main>
  );
}
