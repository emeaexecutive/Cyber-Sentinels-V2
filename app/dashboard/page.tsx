import Link from "next/link";
import {
  ClipboardCheck,
  FileWarning,
  History,
  ScanSearch,
} from "lucide-react";
import { redirect } from "next/navigation";
import { EnterpriseDecisionCard } from "@/components/enterprise-decision-card";
import { buildDecisionIntelligence } from "@/lib/core/decision-intelligence";
import { buildEvidenceGraphDemo } from "@/lib/evidence-graph/evidence-graph";
import { buildProviderReadinessChecklist } from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";
import { buildDemoTrustExplanation } from "@/lib/trust-explanation/explanation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [flags, reviews, integrity, receipts] = await Promise.all([
    supabase.from("interview_risk_events").select("*", { count: "exact", head: true }).eq("escalation_required", true),
    supabase.from("governance_actions").select("*", { count: "exact", head: true }).in("action_status", ["pending", "in_review", "escalated"]),
    supabase.from("session_integrity_checks").select("*", { count: "exact", head: true }),
    supabase.from("verification_receipts").select("*", { count: "exact", head: true }),
  ]);

  const metrics = [
    ["Active Flags", flags.count ?? 0, FileWarning, "/dashboard/interview-risk"],
    ["Pending Reviews", reviews.count ?? 0, ClipboardCheck, "/dashboard/governance"],
    ["Session Integrity", integrity.count ?? 0, ScanSearch, "/dashboard/session-integrity"],
    ["Verification Receipts", receipts.count ?? 0, History, "/verification-receipts"],
  ] as const;
  const noOperationalActivity = metrics.every(([, value]) => value === 0);
  const demoExplanation = buildDemoTrustExplanation(buildEvidenceGraphDemo());
  const demoDecision = buildDecisionIntelligence({
    explanation: demoExplanation,
    providerReadiness: buildProviderReadinessChecklist(),
  });

  return (
    <main className="min-h-screen bg-sentinel-black px-5 py-8 text-sentinel-white sm:px-6 md:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-sentinel-green">Operational Trust</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Review Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-sentinel-muted">
              Review Trust Engine flags, Runtime Engine session context,
              Governance Engine actions and Replay Engine outcomes in one
              operational path.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["/trust-replay", "Replay Timeline"],
              ["/dashboard/governance", "Governance Review"],
            ].map(([href, label], index) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  index === 0
                    ? "bg-white text-black"
                    : "border border-sentinel-line text-sentinel-muted hover:border-sentinel-green hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([title, value, Icon, href]) => (
            <Link key={title} href={href} className="rounded-lg border border-sentinel-line bg-white/[0.04] p-5 hover:border-sentinel-green">
              <Icon className="h-6 w-6 text-sentinel-green" />
              <p className="mt-4 text-sm text-sentinel-muted">{title}</p>
              <p className="mt-1 text-3xl font-semibold">{value}</p>
            </Link>
          ))}
        </section>

        {noOperationalActivity ? (
          <section className="mt-6 rounded-lg border border-sentinel-line bg-sentinel-panel/80 p-5">
            <h2 className="text-xl font-semibold">No active operational review items</h2>
            <p className="mt-3 text-sm leading-6 text-sentinel-muted">
              New flags, reviewer assignments and retained outcomes will appear here as workflows progress.
            </p>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-sentinel-green">Decision Intelligence Demo</p>
              <h2 className="mt-2 text-xl font-semibold">Enterprise decision card</h2>
            </div>
            <Link href="/trust/transparency?demo=1" className="text-sm font-semibold text-cyan-200 hover:text-white">
              Open explanation
            </Link>
          </div>
          <EnterpriseDecisionCard intelligence={demoDecision} />
        </section>

        <section className="mt-8 rounded-lg border border-sentinel-line bg-sentinel-panel/80 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pilot review path</h2>
              <p className="mt-2 text-sm text-sentinel-muted">
                Operator surfaces map the five-engine platform into one review path.
              </p>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">Evidence-first workflow</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["/dashboard/interview-risk", "1. Review Flags", "Inspect identity, injection and session integrity flags."],
              ["/dashboard/governance", "2. Open Governance Review", "Assign review ownership, escalation reason and next action."],
              ["/trust-replay", "3. Review Verification Chronology", "Reconstruct timestamps, active flags, reviewer actions and verification evidence."],
              ["/dashboard/trust-posture", "4. Check Workflow Trust", "Confirm current authorization and workflow state before sharing verification receipts or replay evidence."],
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
