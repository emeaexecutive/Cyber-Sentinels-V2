import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  demoRecoveryCases,
  recoveryActions,
  recoveryAuditEvents,
  recoverySignals,
  recoveryStatuses,
  recoveryTriggers,
} from "@/lib/trust-engine/trustRecovery";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

type RecoveryBucket = {
  title: string;
  items: typeof demoRecoveryCases;
};

function statusClass(status: string) {
  if (["approved", "restored"].includes(status)) {
    return "border-emerald-700 text-emerald-200";
  }

  if (["denied", "expired"].includes(status)) {
    return "border-red-700 text-red-200";
  }

  return "border-amber-700 text-amber-200";
}

function formatTime(value: string | null) {
  if (!value) return "demo";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function TrustRecoveryPage() {
  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select("id,event,created_at")
    .or("event.ilike.%recovery%,event.ilike.%restored%")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<Signal[]>();
  const evidenceRequired = demoRecoveryCases.filter(
    (item) => item.status === "evidence_required"
  );
  const stepUpRequired = demoRecoveryCases.filter(
    (item) => item.status === "step_up_required"
  );
  const adminReview = demoRecoveryCases.filter((item) =>
    ["in_review", "admin_review"].includes(item.status)
  );
  const restoredTrust = demoRecoveryCases.filter(
    (item) => item.status === "restored"
  );
  const deniedRecovery = demoRecoveryCases.filter(
    (item) => item.status === "denied"
  );
  const buckets: RecoveryBucket[] = [
    { title: "Evidence Required", items: evidenceRequired },
    { title: "Step-Up Required", items: stepUpRequired },
    { title: "Admin Review", items: adminReview },
    { title: "Restored Trust", items: restoredTrust },
    { title: "Denied Recovery", items: deniedRecovery },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/revocation-engine", "Revocation Engine"],
            ["/step-up-verification", "Step-Up Verification"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/mission-control", "Mission Control"],
            ["/admin", "Admin"],
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
            Appeal workflow
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Recovery&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust can be lost. It can also be rebuilt with evidence.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {demoRecoveryCases.map((item) => (
            <div
              key={item.subject}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{item.recovery_reason}</p>
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
            <h2 className="text-xl font-semibold">Recovery Queue</h2>
            <div className="mt-5 space-y-3">
              {demoRecoveryCases.map((item) => (
                <div
                  key={`queue-${item.subject}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{item.subject}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.recovery_reason} / {item.status}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recovery Triggers</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {recoveryTriggers.map((trigger) => (
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
            <h2 className="text-xl font-semibold">Recovery Actions</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {recoveryActions.map((action) => (
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

        <section className="mt-8 grid gap-6 lg:grid-cols-5">
          {buckets.map(({ title, items }) => (
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
                  <p className="text-sm text-zinc-500">
                    No demo cases in this lane.
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recovery History</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {recoveryStatuses.map((status) => (
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
            <div className="mt-5 flex flex-wrap gap-2">
              {recoveryAuditEvents.map((event) => (
                <code
                  key={event}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {event}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Recovery Signals</h2>
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
                : recoverySignals.map((signal) => (
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
      </div>
    </main>
  );
}
