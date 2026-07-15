import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionSummary } from "@/components/executive-summary";
import { buildProviderReadinessChecklist, summarizeProviderReadiness } from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [flags, reviews, integrity, receipts, decisions, evidence, replay, pendingActions] = await Promise.all([
    supabase.from("interview_risk_events").select("*", { count: "exact", head: true }).eq("escalation_required", true),
    supabase.from("governance_actions").select("*", { count: "exact", head: true }).in("action_status", ["pending", "in_review", "escalated"]),
    supabase.from("session_integrity_checks").select("*", { count: "exact", head: true }),
    supabase.from("verification_receipts").select("*", { count: "exact", head: true }),
    supabase.from("trust_timeline_events").select("*", { count: "exact", head: true }).in("event_type", ["decision_completed", "governance_decision"]),
    supabase.from("evidence_files").select("*", { count: "exact", head: true }),
    supabase.from("trust_replay_sessions").select("*", { count: "exact", head: true }),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
  ]);

  const providerReadiness = summarizeProviderReadiness(buildProviderReadinessChecklist());
  const metrics = [
    ["Current Trust Posture", reviews.count || flags.count ? "Attention" : "Stable", "/dashboard/trust-posture", `${flags.count ?? 0} active flag(s); ${integrity.count ?? 0} integrity check(s)`],
    ["Recent Decisions", decisions.count ?? "Awaiting data", "/trust-replay", "Retained decision and governance events"],
    ["Evidence Summary", evidence.count ?? "Awaiting data", "/evidence-vault", `${receipts.count ?? 0} verification receipt(s)`],
    ["Replay Activity", replay.count ?? "Awaiting data", "/trust-replay", "Retained replay sessions"],
    ["Trust Memory", "Process-local", "/dashboard/trust-posture", "Updates are replay-linked; no autonomous learning claim"],
    ["Provider Status", `${providerReadiness.classifications.productionReady + providerReadiness.classifications.configured} configured`, "/admin/provider-status", `${providerReadiness.classifications.awaitingCredentials} awaiting credentials`],
    ["Open Reviews", reviews.count ?? "Awaiting data", "/dashboard/governance", "Pending, in-review or escalated"],
    ["Pending Actions", pendingActions.count ?? "Awaiting data", "/notifications", "Unread accountable actions"],
  ] as const;
  const noOperationalActivity = (flags.count ?? 0) === 0 && (reviews.count ?? 0) === 0;

  return (
    <main className="min-h-screen bg-sentinel-black px-5 py-8 text-sentinel-white sm:px-6 md:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-sentinel-green">Operational Trust</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Review Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-sentinel-muted">
              Review current posture, risk, evidence, ownership and the next
              accountable action in one operational path.
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

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: noOperationalActivity ? "No active operational review items" : "Review activity requires attention" },
            { label: "Current risks", value: `${flags.count ?? 0} active flag(s); ${reviews.count ?? 0} pending review(s)` },
            { label: "Recommended action", value: reviews.count ? "Open Governance Review and assign the next action" : "Monitor for new trust changes" },
            { label: "Evidence available", value: `${integrity.count ?? 0} integrity check(s); ${receipts.count ?? 0} receipt(s)` },
            { label: "Confidence", value: "Evidence-backed per case; no portfolio certainty claim" },
            { label: "Responsible owner", value: reviews.count ? "Assigned governance reviewer" : "Workflow owner" },
          ]} />
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([title, value, href, detail]) => (
            <Link key={title} href={href} className="rounded-lg border border-sentinel-line bg-white/[0.04] p-5 hover:border-sentinel-green">
              <p className="text-sm text-sentinel-muted">{title}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
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

        <section className="mt-8 rounded-lg border border-sentinel-line bg-sentinel-panel/80 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pilot review path</h2>
              <p className="mt-2 text-sm text-sentinel-muted">
                Operator surfaces connect risk, ownership, evidence and outcome in one review path.
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
