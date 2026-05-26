import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionGuard } from "@/components/session-guard";
import { getQaReadiness, type QaStatus } from "@/lib/qa/checks";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusClass(status: QaStatus) {
  if (status === "ready") return "border-emerald-700 text-emerald-200";
  if (status === "partial") return "border-amber-700 text-amber-200";
  if (status === "blocked") return "border-red-700 text-red-200";

  return "border-zinc-700 text-zinc-300";
}

export default async function QaConsolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const readiness = await getQaReadiness();

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <SessionGuard />
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/launch-console", "Launch Console"],
            ["/admin", "Admin"],
            ["/command-center", "Command Center"],
            ["/verification-queue", "Verification Queue"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Private beta QA
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            QA Console
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Test status for critical Cyber Sentinels flows after each deploy.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Overall", readiness.summary.status],
            ["Ready", readiness.summary.ready],
            ["Partial", readiness.summary.partial],
            ["Missing", readiness.summary.missing],
            ["Blocked", readiness.summary.blocked],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold capitalize">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {readiness.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-5 space-y-3">
                {section.checks.map((check) => (
                  <div
                    key={check.label}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-zinc-100">{check.label}</p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                          check.status,
                        )}`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">{check.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
