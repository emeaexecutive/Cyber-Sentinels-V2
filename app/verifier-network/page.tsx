import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  demoVerifiers,
  normalizeVerifiers,
  verifierAuditEvents,
  verifierCapabilities,
  verifierSignals,
  verifierStatuses,
  verifierTypes,
  type VerifierRow,
} from "@/lib/verifier-network/verifiers";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

function statusClass(status: string | null | undefined) {
  if (status === "approved") return "border-emerald-700 text-emerald-200";
  if (["suspended", "revoked"].includes(status ?? "")) {
    return "border-red-700 text-red-200";
  }

  return "border-amber-700 text-amber-200";
}

export default async function VerifierNetworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data, error }, { data: signals }] = await Promise.all([
    supabase
      .from("verifiers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<VerifierRow[]>(),
    supabase
      .from("signals")
      .select("id,event,created_at")
      .or("event.ilike.%verifier%,event.ilike.%case_assigned%")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Signal[]>(),
  ]);
  const verifiers = !error && data?.length ? normalizeVerifiers(data) : demoVerifiers;
  const approved = verifiers.filter((item) => item.status === "approved");
  const pending = verifiers.filter((item) =>
    ["pending", "under_review"].includes(item.status ?? "")
  );
  const suspended = verifiers.filter((item) =>
    ["suspended", "revoked"].includes(item.status ?? "")
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/admin", "Admin"],
            ["/mission-control", "Mission Control"],
            ["/verification-queue", "Verification Queue"],
            ["/team-workspace", "Team Workspace"],
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
            Partner review layer
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Verifier Network™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Approved verifiers, reviewers and trust partners for distributed
            Cyber Sentinels review workflows.
          </p>
          {error || !data?.length ? (
            <p className="mt-3 text-sm text-zinc-600">
              Showing demo verifiers until the verifiers table contains records.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-5">
          {[
            ["Approved Verifiers", approved.length],
            ["Pending Verifiers", pending.length],
            ["Suspended / Revoked", suspended.length],
            ["Assigned Cases", verifiers.reduce((sum, item) => sum + (item.assigned_cases ?? 0), 0)],
            ["Completed Reviews", verifiers.reduce((sum, item) => sum + (item.completed_reviews ?? 0), 0)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Approved Verifiers</h2>
            <div className="mt-5 space-y-3">
              {approved.map((verifier) => (
                <div
                  key={verifier.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {verifier.verifier_name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {verifier.verifier_type} / {verifier.organisation}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                        verifier.status
                      )}`}
                    >
                      {verifier.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {verifier.capabilities.map((capability) => (
                      <code
                        key={`${verifier.id}-${capability}`}
                        className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                      >
                        {capability}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Pending Verifiers</h2>
              <div className="mt-5 space-y-3">
                {pending.map((verifier) => (
                  <div
                    key={verifier.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">
                      {verifier.verifier_name}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {verifier.verifier_type} / {verifier.status}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Suspended / Revoked</h2>
              <div className="mt-5 space-y-3">
                {suspended.length ? (
                  suspended.map((verifier) => (
                    <div
                      key={verifier.id}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="font-medium text-zinc-100">
                        {verifier.verifier_name}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500">
                        {verifier.status}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">
                    No suspended or revoked demo verifiers.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Capabilities</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {verifierCapabilities.map((capability) => (
                <code
                  key={capability}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {capability}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Review Assignments</h2>
            <div className="mt-5 space-y-3">
              {verifiers.slice(0, 4).map((verifier) => (
                <div
                  key={`assignment-${verifier.id}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">
                    {verifier.verifier_name}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {verifier.assigned_cases ?? 0} assigned /{" "}
                    {verifier.completed_reviews ?? 0} completed
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Partner Roles</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {verifierTypes.map((type) => (
                <code
                  key={type}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {type}
                </code>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {verifierStatuses.map((status) => (
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
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verifier Audit History</h2>
            <div className="mt-5 space-y-3">
              {signals?.length
                ? signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal.event}</p>
                    </div>
                  ))
                : verifierSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal}</p>
                    </div>
                  ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit Events</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {verifierAuditEvents.map((event) => (
                <code
                  key={event}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {event}
                </code>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-zinc-500">
              Only admins should approve, suspend or revoke verifiers in
              production.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
