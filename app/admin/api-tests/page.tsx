import Link from "next/link";
import { redirect } from "next/navigation";
import { apiTestNames, readLatestApiTestRuns, type ApiTestStatus } from "@/lib/api-tests/harness";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ApiTestRunRow = {
  id: string;
  test_name: string | null;
  status: ApiTestStatus | string | null;
  safe_message: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not checked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not checked";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: string) {
  if (status === "not_run") return "Not run";
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "warning") return "Warning";
  return "Not run";
}

function statusClass(status: string) {
  if (status === "passed") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }

  if (status === "failed") {
    return "border-red-800 bg-red-950/20 text-red-200";
  }

  if (status === "warning") {
    return "border-amber-800 bg-amber-950/20 text-amber-200";
  }

  return "border-zinc-700 bg-zinc-950 text-zinc-300";
}

function latestByTest(rows: ApiTestRunRow[]) {
  const latest = new Map<string, ApiTestRunRow>();

  for (const row of rows) {
    const testName = String(row.test_name ?? "");
    if (testName && !latest.has(testName)) {
      latest.set(testName, row);
    }
  }

  return latest;
}

export default async function AdminApiTestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ran?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/api-tests");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/api-tests" });

  const rows = (await readLatestApiTestRuns()) as ApiTestRunRow[];
  const latest = latestByTest(rows);
  const cards = apiTestNames.map((testName) => {
    const row = latest.get(testName);

    return {
      testName,
      status: String(row?.status ?? "not_run"),
      safeMessage: row?.safe_message ?? "This test has not been run yet.",
      lastChecked: row?.created_at ?? null,
      metadata: row?.metadata ?? {},
    };
  });
  const passed = cards.filter((card) => card.status === "passed").length;
  const failed = cards.filter((card) => card.status === "failed").length;
  const warnings = cards.filter((card) => card.status === "warning").length;
  const notRun = cards.filter((card) => card.status === "not_run").length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Core API Test Harness</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Safe internal diagnostics for critical Cyber Sentinels APIs and
                workflows. Diagnostic records are labelled and cleaned up where
                possible. Secrets are never displayed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/integrations"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
              >
                API Registry
              </Link>
              <form action="/api/admin/api-tests/run" method="POST">
                <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                  Run Safe Tests
                </button>
              </form>
            </div>
          </div>
          {query.ran ? (
            <div className="mt-5 rounded-lg border border-cyan-900 bg-cyan-950/20 p-4 text-sm text-cyan-100">
              Safe API tests completed. Latest results are shown below.
            </div>
          ) : null}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Passed", passed],
            ["Failed", failed],
            ["Warnings", warnings],
            ["Not Run", notRun],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {cards.map((card) => {
            const metadata = card.metadata ?? {};
            const diagnostic = metadata.diagnostic === true;
            const cleanedUp = metadata.cleaned_up === true;

            return (
              <article key={card.testName} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{card.testName}</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      Last checked: {formatDate(card.lastChecked)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(card.status)}`}>
                    {statusLabel(card.status)}
                  </span>
                </div>
                <p className="mt-4 rounded-lg border border-zinc-800 bg-black p-3 text-sm leading-6 text-zinc-300">
                  {card.safeMessage}
                </p>
                <div className="mt-4 grid gap-3 text-xs text-zinc-500 md:grid-cols-3">
                  <div className="rounded-lg border border-zinc-800 bg-black p-3">
                    Diagnostic: {diagnostic ? "true" : "n/a"}
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black p-3">
                    Cleaned up: {cleanedUp ? "true" : "n/a"}
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black p-3">
                    Secrets exposed: false
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
