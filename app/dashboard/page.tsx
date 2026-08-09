import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionSummary } from "@/components/executive-summary";
import { buildProviderReadinessChecklist, summarizeProviderReadiness } from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function countValue(result: { count: number | null; error: unknown }) {
  return result.error ? "Unavailable" : (result.count ?? 0);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [
    liveTrust,
    evidenceGraph,
    replay,
    trustDna,
    recentEvents,
    verificationQueue,
    riskAlerts,
    enterprisePolicies,
    providerResults,
    recentDecisions,
    reviews,
    integrity,
    receipts,
    pendingActions,
  ] = await Promise.all([
    supabase.from("trust_profiles").select("*", { count: "exact", head: true }),
    supabase.from("evidence_nodes").select("*", { count: "exact", head: true }),
    supabase.from("replay_events").select("*", { count: "exact", head: true }),
    supabase.from("trust_dimensions").select("*", { count: "exact", head: true }),
    supabase.from("trust_signals").select("*", { count: "exact", head: true }),
    supabase.from("verification_cases").select("*", { count: "exact", head: true }),
    supabase.from("trust_alerts").select("*", { count: "exact", head: true }).in("status", ["open", "acknowledged", "investigating"]),
    supabase.from("trust_policy_versions").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("provider_results").select("*", { count: "exact", head: true }),
    supabase.from("trust_history").select("*", { count: "exact", head: true }).eq("event_type", "DECISION_RECORDED"),
    supabase.from("governance_actions").select("*", { count: "exact", head: true }).in("action_status", ["pending", "in_review", "escalated"]),
    supabase.from("session_integrity_checks").select("*", { count: "exact", head: true }),
    supabase.from("verification_receipts").select("*", { count: "exact", head: true }),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
  ]);

  const providerReadiness = summarizeProviderReadiness(buildProviderReadinessChecklist());
  const metrics = [
    ["Current Trust Posture", countValue(liveTrust), "/dashboard/trust-runtime", "Immutable Trust DNA profile snapshots"],
    ["Evidence Graph · Evidence Summary", countValue(evidenceGraph), "/admin/evidence-graph", "Tenant-scoped normalized evidence nodes"],
    ["Replay Activity", countValue(replay), "/dashboard/replay", "Forensic entity timelines and audit exports"],
    ["Trust DNA · Trust Memory", countValue(trustDna), "/dashboard/trust-posture", "Explainable dimension measurements"],
    ["Recent Events", countValue(recentEvents), "/trust-events", "Continuous trust signals retained"],
    ["Verification Queue · Open Reviews", countValue(verificationQueue), "/admin/reviews", "Real verification cases available for review"],
    ["Risk Alerts", countValue(riskAlerts), "/dashboard/trust-runtime", "Open, acknowledged or investigating alerts"],
    ["Enterprise Policies", countValue(enterprisePolicies), "/admin/trust-architecture/policies", "Active tenant-visible policy versions"],
    ["Provider Status", countValue(providerResults), "/admin/provider-status", `${providerReadiness.classifications.productionReady + providerReadiness.classifications.configured} adapter(s) configured`],
    ["Recent Decisions", countValue(recentDecisions), "/dashboard/trust-architecture", "Decision Intelligence history records"],
  ] as const;
  const noOperationalActivity = (riskAlerts.count ?? 0) === 0 && (reviews.count ?? 0) === 0;

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
            <Link
              href="/notifications"
              className="rounded-lg border border-sentinel-line px-4 py-2 text-sm font-semibold text-sentinel-muted hover:border-sentinel-green hover:text-white"
            >
              {countValue(pendingActions)} Pending Actions
            </Link>
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
            { label: "Current risks", value: `${riskAlerts.count ?? 0} active alert(s); ${reviews.count ?? 0} pending review(s)` },
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
