import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  readRuntimeValidationLogs,
  runRuntimeValidation,
  writeRuntimeValidationLog,
  type RuntimeValidationCheck,
  type ValidationState,
} from "@/lib/runtime-validation/runner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getRequestBaseUrl(host: string | null, proto: string | null) {
  const fallback =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  if (!host) {
    return fallback;
  }

  return `${proto ?? "https"}://${host}`;
}

function stateLabel(state: ValidationState) {
  return state === "FAIL" ? "FAILURE" : state;
}

function stateClass(state: ValidationState) {
  if (state === "PASS") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }

  if (state === "FAIL") {
    return "border-red-800 bg-red-950/20 text-red-200";
  }

  return "border-amber-800 bg-amber-950/20 text-amber-200";
}

function readinessClass(state: string) {
  if (state === "READY") {
    return "border-emerald-800 text-emerald-200";
  }

  if (state === "BLOCKED") {
    return "border-red-800 text-red-200";
  }

  return "border-amber-800 text-amber-200";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function groupChecks(checks: RuntimeValidationCheck[]) {
  const grouped = new Map<string, RuntimeValidationCheck[]>();

  for (const check of checks) {
    grouped.set(check.category, [...(grouped.get(check.category) ?? []), check]);
  }

  return [...grouped.entries()];
}

export default async function RuntimeValidationPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/runtime-validation");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/runtime-validation" });

  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(
    requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto")
  );
  const summary = await runRuntimeValidation(baseUrl);

  await writeRuntimeValidationLog(summary);

  const logs = await readRuntimeValidationLogs();
  const passCount = summary.checks.filter((check) => check.state === "PASS").length;
  const warningCount = summary.checks.filter((check) => check.state === "WARNING").length;
  const failCount = summary.checks.filter((check) => check.state === "FAIL").length;
  const groupedChecks = groupChecks(summary.checks);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Runtime Validation</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Automated post-deployment checks for public pages, auth,
                enterprise intake, Supabase reachability, protected routes,
                provider configuration and workflow tables.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/status"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
              >
                Status
              </Link>
              <Link
                href="/admin/founder-control"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                Founder Control
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Deployment Summary
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                {summary.healthPercent}% health
              </h2>
              <p className="mt-3 text-sm text-zinc-500">
                Last run: {formatDate(summary.generatedAt)}
              </p>
            </div>
            <span
              className={`rounded-full border px-4 py-2 text-sm ${readinessClass(
                summary.deploymentState
              )}`}
            >
              {summary.deploymentState}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Pass", passCount, "text-emerald-200"],
              ["Warnings", warningCount, "text-amber-200"],
              ["Fail", failCount, "text-red-200"],
              ["Critical blockers", summary.criticalBlockers.length, "text-zinc-100"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {label}
                </p>
                <p className={`mt-2 text-3xl font-semibold ${tone}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h3 className="font-semibold text-zinc-100">Critical Blockers</h3>
              <div className="mt-3 grid gap-2">
                {summary.criticalBlockers.length ? (
                  summary.criticalBlockers.map((item) => (
                    <p key={item} className="text-sm text-red-200">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No critical blockers.</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h3 className="font-semibold text-zinc-100">Warnings</h3>
              <div className="mt-3 grid gap-2">
                {summary.warnings.length ? (
                  summary.warnings.map((item) => (
                    <p key={item} className="text-sm text-amber-200">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No warnings.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6">
          {groupedChecks.map(([category, checks]) => (
            <article key={category} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{category}</h2>
                <p className="text-xs text-zinc-600">
                  {checks.filter((item) => item.state === "PASS").length}/{checks.length} pass
                </p>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {checks.map((item) => (
                  <div key={`${item.category}-${item.label}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {item.message}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(item.state)}`}>
                        {stateLabel(item.state)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Validation History</h2>
          <div className="mt-5 grid gap-3">
            {logs.length ? (
              logs.map((log) => (
                <article key={log.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {log.health_percent ?? 0}% health
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${readinessClass(String(log.deployment_state ?? "CAUTION"))}`}>
                      {log.deployment_state ?? "CAUTION"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-2">
                    <p>Blockers: {log.critical_blockers?.length ?? 0}</p>
                    <p>Warnings: {log.warnings?.length ?? 0}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No runtime validation logs are available yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
