import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  demoRevocationCases,
  revocationActions,
  revocationAuditEvents,
  revocationSignals,
  revocationStatuses,
  revocationTriggers,
} from "@/lib/trust-engine/revocationEngine";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

type RevocationBucket = {
  title: string;
  items: typeof demoRevocationCases;
  empty: string;
};

function statusClass(status: string) {
  if (status === "revoked") return "border-red-700 text-red-200";
  if (["restricted", "under_review", "paused", "expired"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-emerald-700 text-emerald-200";
}

function formatTime(value: string | null) {
  if (!value) return "demo";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function RevocationEnginePage() {
  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select("id,event,created_at")
    .or(
      "event.ilike.%revoked%,event.ilike.%restricted%,event.ilike.%paused%,event.ilike.%locked%,event.ilike.%expired%,event.ilike.%revocation%"
    )
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<Signal[]>();
  const restrictedAgents = demoRevocationCases.filter(
    (item) => item.action === "restrict_agent"
  );
  const pausedApiKeys = demoRevocationCases.filter(
    (item) => item.action === "pause_api_key"
  );
  const expiredClearances = demoRevocationCases.filter(
    (item) => item.action === "expire_clearance"
  );
  const evidenceLocks = demoRevocationCases.filter(
    (item) => item.action === "lock_evidence"
  );
  const buckets: RevocationBucket[] = [
    {
      title: "Restricted Agents",
      items: restrictedAgents,
      empty: "No restricted demo agents.",
    },
    {
      title: "Paused API Keys",
      items: pausedApiKeys,
      empty: "No paused demo API keys.",
    },
    {
      title: "Expired Clearances",
      items: expiredClearances,
      empty: "No expired demo clearances.",
    },
    {
      title: "Evidence Locks",
      items: evidenceLocks,
      empty: "No evidence locks in demo.",
    },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/mission-control", "Mission Control"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/step-up-verification", "Step-Up Verification"],
            ["/trust-recovery", "Trust Recovery"],
            ["/agent-registry", "Agent Registry"],
            ["/back-office", "Back Office"],
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
            Trust reversal
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Revocation Engine&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust must be reversible when reality changes.
          </p>
          <Link
            href="/trust-recovery"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Trust Recovery™
          </Link>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {demoRevocationCases.map((item) => (
            <div
              key={item.subject}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{item.trigger_reason}</p>
              <h2 className="mt-2 text-xl font-semibold">{item.subject}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <code className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200">
                  {item.action}
                </code>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {item.summary}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Active Trust States</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {revocationStatuses.map((status) => (
                <span
                  key={status}
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Revocation Triggers</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {revocationTriggers.map((trigger) => (
                <code
                  key={trigger}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {trigger}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Revocation Actions</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {revocationActions.map((action) => (
                <code
                  key={action}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {action}
                </code>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          {buckets.map(({ title, items, empty }) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <div className="mt-5 space-y-3">
                {items.length ? (
                  items.map((item) => (
                    <div
                      key={`${title}-${item.subject}`}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="font-medium text-zinc-100">
                        {item.subject}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500">
                        {item.action} / {item.status}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">{empty}</p>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Admin Reversal History</h2>
            <div className="mt-5 space-y-3">
              {demoRevocationCases
                .filter((item) =>
                  ["under_review", "revoked"].includes(item.status)
                )
                .map((item) => (
                  <div
                    key={`history-${item.subject}`}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">{item.subject}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {item.trigger_reason} / {item.action}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Revocation Signals</h2>
            <div className="mt-5 space-y-3">
              {signals?.length
                ? signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal.event}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {formatTime(signal.created_at)}
                      </p>
                    </div>
                  ))
                : revocationSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal}</p>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Audit Logs</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {revocationAuditEvents.map((event) => (
              <code
                key={event}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
              >
                {event}
              </code>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
