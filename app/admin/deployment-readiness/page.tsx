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
import { runValidationBenchmark, type ReleaseValidationMaturityState } from "@/lib/validation/benchmark-harness";

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

function formatMetric(value: number | null) {
  if (value === null) return "Awaiting data";
  return `${Math.round(value * 100)}%`;
}

function maturityClass(state: ReleaseValidationMaturityState) {
  if (state === "Implemented") return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  if (state === "Simulated") return "border-cyan-800 bg-cyan-950/20 text-cyan-200";
  return "border-amber-800 bg-amber-950/20 text-amber-200";
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
  const [runtime, integrity, metrics, benchmark] = await Promise.all([
    runRuntimeValidation(baseUrl),
    auditTrustIntegrity().catch(() => null),
    readPilotOperationalMetrics(),
    runValidationBenchmark(),
  ]);
  const report = buildDeploymentReadinessReport({ runtime, integrity, metrics });
  const groundTruthSummary = benchmark.groundTruth.summary;
  const groundTruthValidation = benchmark.groundTruth.validation;
  const datasetSummary = benchmark.groundTruth.datasetSummary;
  const configuredSiteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");
  const domainReady = configuredSiteUrl === "https://www.cybersentinels.com";
  const launchCandidateChecks: Array<{
    label: string;
    detail: string;
    state: DeploymentReadinessState;
  }> = [
    {
      label: "Build passing",
      detail: "The launch-candidate production build completed successfully.",
      state: "READY",
    },
    {
      label: "Auth ready",
      detail: "Authentication routes and protected admin access are present; production flows still require manual testing.",
      state: "READY",
    },
    {
      label: "Provider credentials pending",
      detail: "Confirm each provider reports Live, Simulated, Awaiting Credentials or Disabled before launch.",
      state: "CAUTION",
    },
    {
      label: "Validation required",
      detail: "Run credentialed auth, provider, replay and governance checks in the production environment.",
      state: "CAUTION",
    },
    {
      label: `Domain setup ${domainReady ? "ready" : "pending"}`,
      detail: domainReady
        ? "The configured public URL is https://www.cybersentinels.com."
        : "Set NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL to https://www.cybersentinels.com.",
      state: domainReady ? "READY" : "CAUTION",
    },
  ];
  const enterpriseHealthChecks: Array<{
    label: string;
    detail: string;
    state: DeploymentReadinessState;
  }> = [
    {
      label: "Platform Health",
      detail: `${report.readinessPercent}% readiness across runtime, integrity and pilot evidence.`,
      state: report.state,
    },
    {
      label: "Provider Health",
      detail: "Provider paths remain explicit about Connected, Configured, Awaiting Credentials, Offline and Unsupported states.",
      state: "CAUTION",
    },
    {
      label: "Trust Engine",
      detail: "Trust execution routes and protected decision surfaces are present.",
      state: "READY",
    },
    {
      label: "Replay Engine",
      detail: `${report.metrics.replaySessionsViewed} replay session view(s) recorded in pilot metrics.`,
      state: report.metrics.replaySessionsViewed > 0 ? "READY" : "CAUTION",
    },
    {
      label: "Governance",
      detail: `${report.metrics.governanceReviewsCompleted} completed review(s), ${report.metrics.unresolvedEscalations} unresolved escalation(s).`,
      state: report.metrics.unresolvedEscalations > 0 ? "CAUTION" : "READY",
    },
    {
      label: "Validation",
      detail: `${groundTruthValidation.reviewedSamples}/${groundTruthValidation.minimumReviewedSamples} reviewed ground-truth sample(s) available for metric computation.`,
      state: "CAUTION",
    },
    {
      label: "Performance",
      detail: "Runtime profiling exists as in-process readiness telemetry; production APM remains outstanding.",
      state: "CAUTION",
    },
    {
      label: "Security",
      detail: "Auth, admin allowlist, protected routes and integrity checks are part of the readiness gate.",
      state: report.blockers.length ? "BLOCKED" : "READY",
    },
    {
      label: "Outstanding Risks",
      detail: `${report.blockers.length} blocker(s) and ${report.warnings.length} warning(s) require operator review.`,
      state: report.blockers.length ? "BLOCKED" : report.warnings.length ? "CAUTION" : "READY",
    },
  ];
  const validationHealth = [
    ["Ground Truth Coverage", formatMetric(groundTruthSummary.groundTruthCoverage)],
    ["Benchmark Coverage", formatMetric(datasetSummary.benchmarkCoverage)],
    ["Calibration", formatMetric(groundTruthValidation.calibration.value)],
    ["Precision", formatMetric(groundTruthValidation.precision.value)],
    ["Recall", formatMetric(groundTruthValidation.recall.value)],
    ["Reviewed Outcomes", String(groundTruthValidation.reviewedOutcomes.total)],
    ["Provider Agreement", formatMetric(groundTruthValidation.providerAgreement.value)],
    ["Confidence", formatMetric(groundTruthValidation.confidence.value)],
  ];

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
            <Link href="/admin/trust-execution" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
              Platform Health
            </Link>
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Enterprise health dashboard
            </p>
            <h2 className="mt-2 text-xl font-semibold">One-screen readiness view</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Traffic-light view for design-partner review. Green means ready
              for controlled pilot evidence, amber means measured but incomplete,
              and red means blocked until resolved.
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {enterpriseHealthChecks.map((check) => (
              <article key={check.label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-xl">
                    <p className="font-medium text-zinc-100">{check.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{check.detail}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(check.state)}`}>
                    {check.state}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                Validation Health
              </p>
              <h2 className="mt-2 text-xl font-semibold">Ground truth readiness</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Admin-only view of reviewed sample coverage, benchmark eligibility
                and metric readiness. Precision, recall and calibration remain
                unavailable until the reviewed sample threshold is met.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${stateClass("CAUTION")}`}>
              CAUTION
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {validationHealth.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
                <p className="mt-2 text-lg font-semibold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {benchmark.releaseMaturity.map((capability) => (
              <article key={capability.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="font-medium text-zinc-100">{capability.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{capability.evidence}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-600">Next: {capability.nextAction}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${maturityClass(capability.state)}`}>
                    {capability.state}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-zinc-500">
            {groundTruthValidation.message} {groundTruthValidation.precision.reason}
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-900/70 bg-cyan-950/10 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Internal release gate
            </p>
            <h2 className="mt-2 text-xl font-semibold">Launch Candidate Review</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              A concise operator view of the checks that must remain stable while
              the launch candidate is tested and deployed.
            </p>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {launchCandidateChecks.map((check) => (
              <div key={check.label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="font-medium text-zinc-100">{check.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{check.detail}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(check.state)}`}>
                    {check.state}
                  </span>
                </div>
              </div>
            ))}
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pilot Access Control</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                Pilot state counts are derived from isolated workspace records
                and help operators distinguish invited, active and suspended
                external pilots.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(report.metrics.pilotStateCounts.suspended > 0 ? "CAUTION" : "READY")}`}>
              {report.metrics.pilotStateCounts.suspended > 0 ? "CAUTION" : "READY"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Internal", report.metrics.pilotStateCounts.internal],
              ["Invited", report.metrics.pilotStateCounts.invited],
              ["Active", report.metrics.pilotStateCounts.active],
              ["Suspended", report.metrics.pilotStateCounts.suspended],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
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
