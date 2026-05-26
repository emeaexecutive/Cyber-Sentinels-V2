import Link from "next/link";
import {
  demoLaunchReadiness,
  readinessStates,
  type ChecklistItem,
  type ReadinessState,
} from "@/lib/launch/readiness";

function stateClass(state: ReadinessState) {
  if (state === "ready") return "border-emerald-700 text-emerald-200";
  if (state === "partial") return "border-amber-700 text-amber-200";
  if (state === "blocked") return "border-red-700 text-red-200";

  return "border-zinc-700 text-zinc-300";
}

function Checklist({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black p-4"
          >
            <p className="text-sm text-zinc-300">{item.label}</p>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${stateClass(
                item.state
              )}`}
            >
              {item.state}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LaunchConsolePage() {
  const readiness = demoLaunchReadiness;
  const criticalBlockers = readiness.modules.filter(
    (module) => module.state === "blocked"
  );
  const readyModules = readiness.modules.filter((module) => module.state === "ready");
  const partialModules = readiness.modules.filter(
    (module) => module.state === "partial"
  );
  const missingModules = readiness.modules.filter(
    (module) => module.state === "missing"
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/admin", "Admin"],
            ["/mission-control", "Mission Control"],
            ["/qa-console", "QA Console"],
            ["/trust-registry", "Trust Registry"],
            ["/developer-console", "Developer Console"],
            ["/billing", "Billing"],
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
            V1 private beta readiness
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Launch Console&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Private beta readiness for the Cyber Sentinels trust layer.
          </p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">
            Cyber Sentinels V1 is a private beta trust operations layer. It
            combines Trust Passports, Human Presence, Origin Trace, Evidence,
            Policy, Decisions, Audit and Public Verification.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["V1 Readiness Score", `${readiness.score}%`],
            ["Launch Status", readiness.status],
            ["Ready Modules", readyModules.length],
            ["Partial Modules", partialModules.length],
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
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Critical Blockers</h2>
            <div className="mt-5 space-y-3">
              {criticalBlockers.length ? (
                criticalBlockers.map((module) => (
                  <div
                    key={module.category}
                    className="rounded-lg border border-red-900 bg-black p-4"
                  >
                    <p className="font-medium text-red-200">{module.category}</p>
                    <p className="mt-2 text-sm text-zinc-500">{module.notes}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-emerald-900 bg-black p-4 text-sm text-emerald-200">
                  No critical blockers in demo readiness data.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Readiness States</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {readinessStates.map((state) => (
                <span
                  key={state}
                  className={`rounded-full border px-2.5 py-1 text-xs ${stateClass(
                    state
                  )}`}
                >
                  {state}
                </span>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {[
            ["Ready Modules", readyModules],
            ["Partial Modules", partialModules],
            ["Missing Modules", missingModules],
          ].map(([title, modules]) => (
            <section
              key={title as string}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title as string}</h2>
              <div className="mt-5 space-y-3">
                {(modules as typeof readiness.modules).length ? (
                  (modules as typeof readiness.modules).map((module) => (
                    <Link
                      key={module.category}
                      href={module.href}
                      className="block rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-medium text-zinc-100">
                          {module.category}
                        </p>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs ${stateClass(
                            module.state
                          )}`}
                        >
                          {module.state}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">{module.notes}</p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No modules in this state.</p>
                )}
              </div>
            </section>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Checklist
            title="Private Beta Checklist"
            items={readiness.privateBetaChecklist}
          />
          <Checklist title="Security Checklist" items={readiness.securityChecklist} />
          <Checklist title="Supabase Checklist" items={readiness.supabaseChecklist} />
          <Checklist title="Vercel Checklist" items={readiness.vercelChecklist} />
          <Checklist title="Beta Launch Checklist" items={readiness.betaLaunchChecklist} />
        </section>
      </div>
    </main>
  );
}
