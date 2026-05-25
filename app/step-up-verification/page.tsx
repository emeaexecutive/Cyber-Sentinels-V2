import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  demoStepUpRequests,
  stepUpAuditEvents,
  stepUpMethods,
  stepUpSignals,
  stepUpTriggerReasons,
} from "@/lib/trust-engine/stepUpVerification";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

function statusClass(status: string) {
  if (["verified", "not_required"].includes(status)) {
    return "border-emerald-700 text-emerald-200";
  }

  if (["failed", "expired"].includes(status)) {
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

export default async function StepUpVerificationPage() {
  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select("id,event,created_at")
    .or("event.ilike.%step_up%,event.ilike.%permission_step_up%")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<Signal[]>();
  const pendingRequests = demoStepUpRequests.filter((request) =>
    ["required", "pending", "submitted", "manual_review"].includes(
      request.status
    )
  );
  const completedRequests = demoStepUpRequests.filter(
    (request) => request.status === "verified"
  );
  const failedRequests = demoStepUpRequests.filter((request) =>
    ["failed", "expired"].includes(request.status)
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/mission-control", "Mission Control"],
            ["/developer-console", "Developer Console"],
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
            Proof before permission
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Step-Up Verification&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            High-risk actions require stronger proof before permission.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {demoStepUpRequests.map((request) => (
            <div
              key={request.action}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{request.subject}</p>
              <h2 className="mt-2 text-xl font-semibold">{request.action}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <code className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200">
                  {request.method}
                </code>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    request.status
                  )}`}
                >
                  {request.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {request.evidence}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Why Step-Up Was Triggered</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {stepUpTriggerReasons.map((reason) => (
                <code
                  key={reason}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {reason}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Required Evidence</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <p>Fresh liveness proof for weak human presence.</p>
              <p>Documents or source links for weak origin trace.</p>
              <p>Admin confirmation for protected back-office actions.</p>
              <p>Manual review before elevated agent autonomy.</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Methods</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {stepUpMethods.map((method) => (
                <code
                  key={method}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {method}
                </code>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Pending Requests</h2>
            <div className="mt-5 space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={`pending-${request.action}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{request.action}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {request.method} / {request.status}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Completed Step-Ups</h2>
            <div className="mt-5 space-y-3">
              {completedRequests.map((request) => (
                <div
                  key={`completed-${request.action}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{request.action}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {request.method} / verified
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Failed / Expired</h2>
            <div className="mt-5 space-y-3">
              {failedRequests.length ? (
                failedRequests.map((request) => (
                  <div
                    key={`failed-${request.action}`}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">{request.action}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {request.method} / {request.status}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  No failed or expired step-ups in the demo queue.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Manual Review Queue</h2>
            <div className="mt-5 space-y-3">
              {demoStepUpRequests
                .filter((request) => request.method === "manual_review")
                .map((request) => (
                  <div
                    key={`manual-${request.action}`}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">{request.action}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {request.trigger_reason} / {request.status}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Step-Up Signals</h2>
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
                : stepUpSignals.map((signal) => (
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
          <h2 className="text-xl font-semibold">Audit Events</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {stepUpAuditEvents.map((event) => (
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
