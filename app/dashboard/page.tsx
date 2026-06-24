import Link from "next/link";
import {
  ClipboardCheck,
  FileWarning,
  History,
  ScanSearch,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [flags, reviews, governance, integrity, receipts, threatActivity] = await Promise.all([
    supabase.from("interview_risk_events").select("*", { count: "exact", head: true }).eq("escalation_required", true),
    supabase.from("governance_actions").select("*", { count: "exact", head: true }).in("action_status", ["pending", "in_review", "escalated"]),
    supabase.from("governance_actions").select("*", { count: "exact", head: true }),
    supabase.from("session_integrity_checks").select("*", { count: "exact", head: true }),
    supabase.from("verification_receipts").select("*", { count: "exact", head: true }),
    supabase.from("interview_risk_events").select("*", { count: "exact", head: true }),
  ]);

  const metrics = [
    ["Active Flags", flags.count ?? 0, FileWarning],
    ["Pending Reviews", reviews.count ?? 0, ClipboardCheck],
    ["Session Integrity", integrity.count ?? 0, ScanSearch],
    ["Verification Receipts", receipts.count ?? 0, History],
    ["Threat Activity", threatActivity.count ?? 0, FileWarning],
    ["Governance Actions", governance.count ?? 0, ClipboardCheck],
  ] as const;

  return (
    <main className="min-h-screen bg-sentinel-black px-6 py-8 text-sentinel-white grid-bg">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sentinel-green">Pilot Operations</p>
            <h1 className="mt-2 text-4xl font-semibold">Hiring Security Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-sentinel-muted">
              Trust changed quietly. Review active flags, pending reviews, session integrity, verification receipts, threat activity and governance actions without operational noise.
            </p>
          </div>
          <Link href="/demo" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
            Run 90-second demo
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([title, value, Icon]) => (
            <div key={title} className="rounded-lg border border-sentinel-line bg-white/[0.04] p-5">
              <Icon className="h-6 w-6 text-sentinel-green" />
              <p className="mt-4 text-sm text-sentinel-muted">{title}</p>
              <p className="mt-1 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-sentinel-line bg-sentinel-panel/80 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pilot review path</h2>
              <p className="mt-2 text-sm text-sentinel-muted">Four operator surfaces cover the complete proof workflow.</p>
            </div>
            <span className="rounded-full border border-emerald-900 px-3 py-1 text-xs text-emerald-200">Replayable and auditable</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["/dashboard/interview-risk", "1. Review active flags", "Inspect identity, injection and session-integrity flags."],
              ["/governance", "2. Record governance action", "Assign review ownership and preserve the human outcome."],
              ["/trust-replay", "3. Replay evidence", "Reconstruct chronology and open generated /replay/[id] records."],
              ["/dashboard/session-integrity", "4. Review receipts", "Use session integrity and generated receipts to explain the final outcome."],
            ].map(([href, title, copy]) => (
              <Link key={href} href={href} className="rounded-lg border border-sentinel-line bg-black/30 p-4 hover:border-sentinel-green">
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-6 text-sentinel-muted">{copy}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
