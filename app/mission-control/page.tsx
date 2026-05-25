import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createMissionControlSnapshot,
  missionSections,
  type MissionDecision,
  type MissionEvidence,
  type MissionPassport,
  type MissionSignal,
  type MissionVerificationCase,
} from "@/lib/trust-engine/missionControl";
import { normalizeAgents, type AgentRow } from "@/lib/trust-engine/agentRegistry";
import { getPublicTrustFeed } from "@/lib/trust-feed/feed";
import { evaluateRealityOS } from "@/lib/trust-engine/realityOS";
import { demoTrustLedgerEvents } from "@/lib/trust-engine/trustLedger";
import { demoLaunchReadiness } from "@/lib/launch/readiness";

export const dynamic = "force-dynamic";

type ApiAuditEvent = {
  event_type: string | null;
  created_at: string | null;
};

function indicatorClass(value: string) {
  if (value === "GREEN" || value === "ACTIVE") {
    return "border-emerald-700 text-emerald-200";
  }

  return "border-cyan-700 text-cyan-200";
}

function formatTime(value: string | null | undefined) {
  if (!value) return "live";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function MissionControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    passportsResult,
    casesResult,
    signalsResult,
    decisionsResult,
    evidenceResult,
    apiAuditResult,
    agentsResult,
  ] = await Promise.all([
    supabase
      .from("passports")
      .select(
        "trust_score,human_presence_index,origin_trace_score,synthetic_risk,suspicious_activity,scan_status,review_status,verification_status,reality_passport_status,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<MissionPassport[]>(),
    supabase
      .from("verification_cases")
      .select("status,verification_status,trust_score,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<MissionVerificationCase[]>(),
    supabase
      .from("signals")
      .select("id,event,created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<MissionSignal[]>(),
    supabase
      .from("decisions")
      .select("decision,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<MissionDecision[]>(),
    supabase
      .from("evidence_files")
      .select("scan_status,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<MissionEvidence[]>(),
    supabase
      .from("audit_logs")
      .select("event_type,created_at")
      .eq("event_type", "trust_api_called")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ApiAuditEvent[]>(),
    supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AgentRow[]>(),
  ]);
  const agents = agentsResult.error ? [] : normalizeAgents(agentsResult.data);
  const snapshot = createMissionControlSnapshot({
    passports: passportsResult.data,
    verificationCases: casesResult.data,
    signals: signalsResult.data,
    decisions: decisionsResult.data,
    evidence: evidenceResult.data,
    apiAuditEvents: apiAuditResult.data,
  });
  const stepUpRequired =
    signalsResult.data?.filter((signal) =>
      /step_up|permission_step_up|agent_permission_escalated/i.test(signal.event)
    ).length ?? 0;
  const revocationEvents =
    signalsResult.data?.filter((signal) =>
      /revoked|restricted|paused|locked|expired|revocation/i.test(signal.event)
    ).length ?? 0;
  const recoveryQueue =
    signalsResult.data?.filter((signal) =>
      /recovery|restored/i.test(signal.event)
    ).length ?? 0;
  const exportCenter =
    signalsResult.data?.filter((signal) =>
      /compliance_export|trust_report|audit_pack|report_exported/i.test(
        signal.event
      )
    ).length ?? 0;
  const verifierNetwork =
    signalsResult.data?.filter((signal) =>
      /verifier|case_assigned/i.test(signal.event)
    ).length ?? 0;
  const trustFeedItems = getPublicTrustFeed(4);
  const realityOS = evaluateRealityOS({
    active_nodes:
      snapshot.metrics.activeVerifications +
      agents.length +
      snapshot.metrics.signalsToday +
      snapshot.metrics.manualReviews,
    agents: agents.length,
    signals: snapshot.metrics.signalsToday || snapshot.metrics.cloneRiskEvents,
    decisions: snapshot.metrics.manualReviews,
    evidence: snapshot.metrics.evidencePendingScan,
    synthetic_activity:
      snapshot.metrics.cloneRiskEvents + snapshot.metrics.realityDriftEvents,
    global_activity:
      snapshot.metrics.signalsToday + snapshot.metrics.apiCallsToday,
    permission_pressure: stepUpRequired + revocationEvents,
    human_presence_strength: snapshot.metrics.averageTrustScore || 84,
  });
  const metrics = [
    ["Reality OS status", realityOS.state],
    ["Launch readiness", `${demoLaunchReadiness.score}%`],
    ["Trust Ledger", demoTrustLedgerEvents.length],
    ["Active verifications", snapshot.metrics.activeVerifications],
    ["Registered agents", agents.length],
    ["Permissions firewall", "ACTIVE"],
    ["Step-Up required", stepUpRequired],
    ["Revocation Engine", revocationEvents || "ACTIVE"],
    ["Recovery Queue", recoveryQueue],
    ["Export Center", exportCenter || "READY"],
    ["Verifier Network", verifierNetwork || "READY"],
    ["Trust Feed", trustFeedItems.length],
    ["Critical alerts", snapshot.metrics.criticalAlerts],
    ["Signals today", snapshot.metrics.signalsToday],
    ["Average trust score", snapshot.metrics.averageTrustScore],
    ["Evidence pending scan", snapshot.metrics.evidencePendingScan],
    ["Human reviews", snapshot.metrics.humanReviews],
    ["API calls today", snapshot.metrics.apiCallsToday],
    ["Manual reviews", snapshot.metrics.manualReviews],
    ["Trust drift events", snapshot.metrics.trustDriftEvents],
    ["Reality Drift", snapshot.metrics.realityDriftEvents || "WATCH"],
    ["HPG signals", snapshot.metrics.hpgSignals || "STABLE"],
    ["Clone Risk", snapshot.metrics.cloneRiskEvents || "WATCH"],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/admin", "Admin"],
            ["/launch-console", "Launch Console"],
            ["/command-center", "Command Center"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/step-up-verification", "Step-Up Verification"],
            ["/revocation-engine", "Revocation Engine"],
            ["/trust-recovery", "Trust Recovery"],
            ["/compliance-export", "Compliance Export"],
            ["/origin-dna", "Origin DNA"],
            ["/reality-chain", "Reality Chain"],
            ["/reality-twin", "Reality Twin"],
            ["/synthetic-counterpart", "Synthetic Counterpart"],
            ["/reality-os", "Reality OS"],
            ["/trust-fabric", "Trust Fabric"],
            ["/human-presence-genome", "Human Presence Genome"],
            ["/verifier-network", "Verifier Network"],
            ["/trust-feed", "Trust Feed"],
            ["/trust-ledger", "Trust Ledger"],
            ["/verification-queue", "Verification Queue"],
            ["/global-trust", "Global Trust"],
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
            Global operations
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Mission Control™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            The operating system for trust.
          </p>
          {snapshot.isDemo ? (
            <p className="mt-3 text-sm text-zinc-600">
              Showing demo live system data until operational tables contain
              activity.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {missionSections.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-500"
            >
              <p className="text-lg font-semibold">{label}</p>
              <p className="mt-2 text-sm text-zinc-500">Open live surface</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Global System Indicators</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {snapshot.systemIndicators.map((indicator) => (
                <div
                  key={indicator.label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-sm text-zinc-500">{indicator.label}</p>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${indicatorClass(
                      indicator.value
                    )}`}
                  >
                    {indicator.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Regional Trust Activity</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              {snapshot.regionalActivity.map((region) => (
                <div
                  key={region.region}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-lg font-semibold">{region.region}</p>
                  <p className="mt-2 text-3xl font-semibold">{region.activity}</p>
                  <p className="mt-2 text-xs text-zinc-500">{region.status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Live Signal Examples</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {snapshot.liveSignals.map((signal, index) => (
              <div
                key={signal.id ?? `${signal.event}-${index}`}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="font-medium text-zinc-100">{signal.event}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  {formatTime(signal.created_at)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Feed Preview</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Public-safe network activity across badges, profiles, agents and marketplaces.
              </p>
            </div>
            <Link
              href="/trust-feed"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Feed
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {trustFeedItems.map((item) => (
              <Link
                key={item.id}
                href={item.public_link}
                className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500"
              >
                <p className="font-medium text-zinc-100">{item.event}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  {item.subject_name} / {item.trust_band}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
