import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  buildDeploymentReadinessReport,
  readPilotOperationalMetrics,
  type DeploymentReadinessState,
} from "@/lib/pilot-execution/readiness";
import { runRuntimeValidation } from "@/lib/runtime-validation/runner";
import { createClient } from "@/lib/supabase/server";
import { auditTrustIntegrity } from "@/lib/trust-integrity/repair";

export const dynamic = "force-dynamic";

function getRequestBaseUrl(host: string | null, proto: string | null) {
  const fallback =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  if (!host) return fallback;

  return `${proto ?? "https"}://${host}`;
}

function stateClass(state: DeploymentReadinessState) {
  if (state === "READY") return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  if (state === "BLOCKED") return "border-red-800 bg-red-950/20 text-red-200";
  return "border-amber-800 bg-amber-950/20 text-amber-200";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function DeploymentReadinessPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/deployment-readiness");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/deployment-readiness" });

  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(
    requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto")
  );
  const [runtime, integrity, metrics] = await Promise.all([
    runRuntimeValidation(baseUrl),
    auditTrustIntegrity().catch(() => null),
    readPilotOperationalMetrics(),
  ]);
  const report = buildDeploymentReadinessReport({ runtime, integrity, metrics });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Deployment Readiness</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Pilot execution view for runtime health, environment readiness,
                auth, APIs, workflow integrity and design-partner onboarding.
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Last checked {formatDate(report.generatedAt)}
              </p>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm ${stateClass(report.state)}`}>
              {report.state}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/runtime-validation" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              Runtime Validation
            </Link>
            <Link href="/admin/trust-integrity" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              Trust Integrity
            </Link>
            <Link href="/enterprise/pilot-setup" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
              Pilot Setup
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Readiness", `${report.readinessPercent}%`],
            ["Blockers", report.blockers.length],
            ["Warnings", report.warnings.length],
            ["Pilot Workspaces", report.metrics.pilotWorkspaces],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Cases Created", report.metrics.casesCreated],
            ["Governance Reviews Completed", report.metrics.governanceReviewsCompleted],
            ["Trust Receipts Generated", report.metrics.trustReceiptsGenerated],
            ["Replay Sessions Viewed", report.metrics.replaySessionsViewed],
            ["Unresolved Escalations", report.metrics.unresolvedEscalations],
            ["Onboarding Completion", `${report.metrics.onboardingCompletion}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5">
          {report.sections.map((section) => (
            <article key={section.category} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{section.category}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{section.message}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(section.state)}`}>
                  {section.state}
                </span>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {section.checks.map((check) => (
                  <div key={`${section.category}-${check.label}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">{check.label}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">{check.message}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(check.state)}`}>
                        {check.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Critical Blockers</h2>
            <div className="mt-4 grid gap-2">
              {report.blockers.length ? (
                report.blockers.map((item) => <p key={item} className="text-sm text-red-200">{item}</p>)
              ) : (
                <p className="text-sm text-zinc-500">No critical blockers.</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Warnings</h2>
            <div className="mt-4 grid gap-2">
              {report.warnings.length ? (
                report.warnings.map((item) => <p key={item} className="text-sm text-amber-200">{item}</p>)
              ) : (
                <p className="text-sm text-zinc-500">No warnings.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
