import Link from "next/link";
import { redirect } from "next/navigation";
import {
  backOfficeConcepts,
  backOfficeStatuses,
  decisionActions,
} from "@/lib/back-office";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string;
};

type AuditLog = {
  id: string;
  event_type: string;
  actor: string | null;
  created_at: string;
};

async function getTableCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string
) {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  return count ?? 0;
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    waitlistCount,
    passportCount,
    trustReportsCount,
    signalsCount,
    auditLogsCount,
    { data: recentSignals },
    { data: recentAuditLogs },
  ] = await Promise.all([
    getTableCount(supabase, "waitlist"),
    getTableCount(supabase, "passports"),
    getTableCount(supabase, "trust_reports"),
    getTableCount(supabase, "signals"),
    getTableCount(supabase, "audit_logs"),
    supabase
      .from("signals")
      .select("id,event,created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Signal[]>(),
    supabase
      .from("audit_logs")
      .select("id,event_type,actor,created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<AuditLog[]>(),
  ]);

  const metrics = [
    { label: "Waitlist", value: waitlistCount },
    { label: "Passports", value: passportCount },
    { label: "Trust Reports", value: trustReportsCount },
    { label: "Signals", value: signalsCount },
    { label: "Audit Logs", value: auditLogsCount },
  ];

  const navLinks = [
    { href: "/command-center", label: "Command Center" },
    { href: "/passport", label: "Passport" },
    { href: "/hiring-shield", label: "Hiring Shield" },
    { href: "/signals", label: "Signals" },
    { href: "/clearances", label: "Clearances" },
  ];

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">
          Back Office Trust Operations
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Review evidence, verify human presence, inspect origin traces and
          approve or escalate trust decisions.
        </p>

        <nav className="mt-8 flex flex-wrap gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <section className="mt-10 grid gap-4 md:grid-cols-5">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <p className="text-zinc-500">{metric.label}</p>
              <p className="mt-3 text-4xl font-bold">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">Verification Queue</h2>
          <p className="mt-3 text-zinc-500">
            Placeholder for verification_cases, evidence_files, decisions,
            risk_scores, teams and api_keys.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-zinc-500">Statuses</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                {backOfficeStatuses.map((status) => (
                  <p key={status}>{status}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Decisions</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                {decisionActions.map((decision) => (
                  <p key={decision}>{decision}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Admin Concepts</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                {backOfficeConcepts.map((concept) => (
                  <p key={concept}>{concept}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xl font-semibold">Recent Signals</h2>
            <div className="mt-5 space-y-3">
              {recentSignals?.length ? (
                recentSignals.map((signal) => (
                  <div key={signal.id} className="rounded-xl border border-zinc-800 p-4">
                    <p className="text-zinc-300">{signal.event}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {new Date(signal.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500">No recent signals.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xl font-semibold">Recent Audit Logs</h2>
            <div className="mt-5 space-y-3">
              {recentAuditLogs?.length ? (
                recentAuditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-zinc-800 p-4">
                    <p className="text-zinc-300">{log.event_type}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {log.actor ?? "system"} ·{" "}
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500">No recent audit logs.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
