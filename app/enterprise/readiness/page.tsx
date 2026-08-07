import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { buildPlatformHealth } from "@/lib/core/platform-health";
import { buildEnterpriseReadinessModel } from "@/lib/enterprise-readiness";
import { getVerificationProviderRegistry } from "@/lib/providers";
import { buildProviderReadinessChecklist } from "@/lib/providers/provider-readiness";
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

const operationalStateStyle = {
  Healthy: "border-emerald-900/70 bg-emerald-950/20 text-emerald-200",
  Degraded: "border-amber-900/70 bg-amber-950/20 text-amber-200",
  "Awaiting Configuration": "border-cyan-900/70 bg-cyan-950/20 text-cyan-200",
  Unavailable: "border-rose-900/70 bg-rose-950/20 text-rose-200",
  Unknown: "border-zinc-700 bg-zinc-900 text-zinc-300",
};

const readinessIndicatorStyle = {
  Ready: "border-emerald-800 text-emerald-200",
  Review: "border-amber-800 text-amber-200",
  Blocked: "border-rose-800 text-rose-200",
};

function metricValue(value: number | null, unit: string) {
  if (value === null) return "Awaiting data";
  if (unit === "ms") return `${value} ms`;
  if (unit === "percent") return `${value}%`;
  if (unit === "per_hour") return `${value}/hr`;
  return String(value);
}

export default async function EnterpriseReadinessPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/enterprise/readiness" });

  const snapshot = await createReadinessGateSnapshot(supabase);
  const tableChecks = snapshot.sections
    .flatMap((section) => section.checks)
    .filter((check) => /table/i.test(check.label));
  const providerChecks = buildProviderReadinessChecklist();
  const platformHealth = buildPlatformHealth({
    authConfigured: true,
    databaseAvailable: tableChecks.length > 0 && tableChecks.every((check) => check.state === "ready"),
  });
  const model = buildEnterpriseReadinessModel(
    snapshot,
    getVerificationProviderRegistry(),
    platformHealth,
    providerChecks
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
                Inspect evidence-backed component health, internal observability,
                provider readiness and deployment gaps before an enterprise
                workflow moves into a controlled pilot.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-5 lg:min-w-64">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                Operational status
              </p>
              <p className="mt-2 text-3xl font-semibold text-cyan-100">
                {model.operational.overallStatus}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {model.readinessPercent}% of deployment gate checks ready
              </p>
            </div>
          </div>
          <p className="mt-6 rounded-lg border border-zinc-800 bg-black/70 p-4 text-sm leading-6 text-zinc-400">
            {model.summary} A ready gate supports controlled design-partner
            evaluation; it does not assert production certification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise/operations" className="brand-primary-action brand-action-large text-sm">
              Enterprise Operations
            </Link>
            <Link href="/admin/readiness-gate" className="brand-primary-action brand-action-large text-sm">
              Inspect Readiness Gate
            </Link>
            <Link href="/admin/runtime-validation" className="brand-secondary-action brand-action-large text-sm">
              Runtime Validation
            </Link>
            <Link href="/enterprise/compliance" className="brand-secondary-action brand-action-large text-sm">
              Compliance Readiness
            </Link>
            <Link href="/docs/ENTERPRISE_PROOF_PACK.md?download=1" className="brand-secondary-action brand-action-large text-sm">
              Download Enterprise Proof Pack
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Enterprise readiness indicators</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold">Eight evidence-linked release gates.</h2>
            <p className="max-w-xl text-sm leading-6 text-zinc-500">Every status links to its canonical supporting evidence; missing deployment evidence remains visible.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.readinessIndicators.map((indicator) => (
              <article key={indicator.id} className="operational-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{indicator.label}</h3>
                  <span className={`enterprise-status-badge ${readinessIndicatorStyle[indicator.state]}`}>{indicator.state}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{indicator.evidence}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{indicator.limitation}</p>
                <Link href={indicator.evidenceHref} className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Inspect evidence →</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Enterprise Trust Fabric health
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Ten pilot-critical components. Evidence before confidence.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-500">
              Generated {new Date(platformHealth.generatedAt).toLocaleString("en-GB")}. Unknown and awaiting states are preserved until a real check exists.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.operational.components.map((item) => (
              <article key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{item.label}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${operationalStateStyle[item.status]}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{item.evidence}</p>
                <p className="mt-3 text-xs leading-5 text-cyan-200">Next: {item.nextAction}</p>
                <p className="mt-3 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">
                  {item.boundary}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Enterprise settings</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold">One index for existing controls.</h2>
            <p className="max-w-xl text-sm leading-6 text-zinc-500">Settings link to the current canonical control surfaces; no parallel configuration route is introduced.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {model.settingsGroups.map((group) => (
              <Link key={group.label} href={group.href} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                <h3 className="font-semibold text-zinc-100">{group.label}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{group.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Internal observability
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Measured values stay separate from missing data.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {model.operational.metrics.metrics.map((metric) => (
              <article key={metric.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-100">{metricValue(metric.value, metric.unit)}</p>
                <p className="mt-2 text-xs text-zinc-500">{metric.sampleCount} retained sample(s)</p>
                <p className="mt-3 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">{metric.limitation}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-500">{model.operational.metrics.boundary}</p>
        </section>

        <section id="performance-evidence" className="mt-8 scroll-mt-28 grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Performance coverage</p>
            <h2 className="mt-3 text-2xl font-semibold">Average, p95 and exception evidence</h2>
            <div className="mt-5 grid gap-3">
              {model.operational.performance.profiles.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-black p-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-zinc-200">{item.label}</span>
                    <span className="text-xs text-zinc-500">{item.sampleCount} sample(s)</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500 sm:grid-cols-4">
                    <span>Average: {item.averageLatencyMs === null ? "Awaiting data" : `${item.averageLatencyMs} ms`}</span>
                    <span>p95: {item.p95LatencyMs === null ? "Awaiting data" : `${item.p95LatencyMs} ms`}</span>
                    <span>Timeouts: {item.timeoutCount ?? "Awaiting data"}</span>
                    <span>Slow: {item.slowOperationCount ?? "Awaiting data"}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-zinc-600">Slow threshold: {item.slowThresholdMs} ms. {item.limitation}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Measured bottlenecks</p>
            <h2 className="mt-3 text-2xl font-semibold">Slowest retained operations</h2>
            <div className="mt-5 grid gap-3">
              {model.operational.performance.bottlenecks.length ? model.operational.performance.bottlenecks.map((item) => (
                <div key={`${item.rank}-${item.recordedAt}`} className="rounded-lg border border-zinc-800 bg-black p-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-zinc-300">{item.label.replaceAll("_", " ")}</span>
                    <span className="font-semibold text-zinc-100">{item.latencyMs} ms</span>
                  </div>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">Awaiting runtime samples. No bottleneck is inferred.</p>
              )}
            </div>
            <p className="mt-5 text-xs leading-5 text-zinc-500">{model.operational.performance.boundary}</p>
          </article>
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
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${stateStyle[item.state]}`}>
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
                Provider readiness
              </p>
              <h2 className="mt-3 text-3xl font-semibold">Lifecycle classification and health remain distinct.</h2>
            </div>
            <Link href="/admin/integrations" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
              Manage integrations →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.operational.providerClassifications.map((provider) => (
              <article key={provider.name} className="rounded-lg border border-zinc-800 bg-black p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{provider.name}</h3>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs uppercase text-zinc-400">
                    {provider.classification}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">{provider.evidence}</p>
                <div className="mt-4 grid gap-1 text-xs text-zinc-500">
                  <p>Runtime: {provider.runtimeState}</p>
                  <p>Health: {provider.health}</p>
                  <p>Latency: {provider.latencyMs === null ? "Awaiting data" : `${provider.latencyMs} ms`}</p>
                  <p>Last successful check: {provider.lastSuccessfulCheck ?? "No successful real check recorded"}</p>
                  <p>Next: {provider.nextAction}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">Known limitations: {provider.limitations.join(" ")}</p>
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
