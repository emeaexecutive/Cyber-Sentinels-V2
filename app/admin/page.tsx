import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminVerificationActions } from "@/components/admin-verification-actions";
import { SessionGuard } from "@/components/session-guard";
import {
  hasAdminVerifiedCookie,
  isAdminAllowlisted,
} from "@/lib/admin-auth";
import {
  backOfficeStatuses,
  decisionActions,
  type BackOfficeStatus,
  type DecisionAction,
} from "@/lib/back-office";
import { createClient } from "@/lib/supabase/server";
import {
  formatTimeAgo,
  normalizeSignals,
} from "@/lib/trust-engine/liveSignals";
import {
  predictTrustRisk,
  type PredictionInputDecision,
} from "@/lib/trust-engine/predictions";
import { evaluateTrustFabric } from "@/lib/trust-engine/trustFabric";
import { demoTrustLedgerEvents } from "@/lib/trust-engine/trustLedger";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type WaitlistEntry = {
  id: string;
  email: string;
  company: string | null;
  role: string | null;
  use_case: string | null;
  created_at: string;
};

type VerificationCase = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  status: BackOfficeStatus | string | null;
  verification_status: BackOfficeStatus | string | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  trust_score: number | null;
  reviewed_by: string | null;
  created_at: string;
};

type Passport = {
  id: string;
  subject_name: string;
  subject_type: string;
  review_status: string | null;
  trust_score: number | null;
  human_presence_index?: number | null;
  origin_trace_score?: number | null;
  synthetic_risk?: number | null;
  voice_clone_risk?: number | null;
  video_deepfake_risk?: number | null;
  linkedin_url: string | null;
  linkedin_verification_status: string | null;
  linkedin_claimed_company: string | null;
  linkedin_claimed_role: string | null;
  linkedin_review_required: boolean | null;
  created_at: string;
};

type TrustReport = {
  id: string;
  candidate_name: string | null;
  report_type: string | null;
  review_status: string | null;
  trust_score: number | null;
  linkedin_url: string | null;
  linkedin_verification_status: string | null;
  linkedin_claimed_company: string | null;
  linkedin_claimed_role: string | null;
  linkedin_review_required: boolean | null;
  created_at: string;
};

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

type EvidenceFile = {
  id: string;
  verification_case_id: string | null;
  file_name: string | null;
  scan_status: string | null;
  created_at: string;
};

type Decision = {
  id: string;
  verification_case_id: string | null;
  decision: DecisionAction | string | null;
  status: BackOfficeStatus | string | null;
  created_at: string;
};

type RiskScore = {
  id: string;
  verification_case_id: string | null;
  score: number | null;
  risk_level: string | null;
  created_at: string;
};

type TableResult<T> = {
  rows: T[];
  count: number;
  available: boolean;
};

async function fetchTable<T>(
  supabase: SupabaseServerClient,
  table: string,
  select: string,
  orderColumn = "created_at",
  limit = 8
): Promise<TableResult<T>> {
  const { data, count, error } = await supabase
    .from(table)
    .select(select, { count: "exact" })
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (error) {
    return { rows: [], count: 0, available: false };
  }

  return {
    rows: data ?? [],
    count: count ?? data?.length ?? 0,
    available: true,
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: string | null }) {
  const normalized =
    status && backOfficeStatuses.includes(status as BackOfficeStatus)
      ? status
      : "pending";

  const styles: Record<BackOfficeStatus, string> = {
    pending: "border-zinc-700 text-zinc-300",
    in_review: "border-cyan-700 text-cyan-200",
    verified: "border-emerald-700 text-emerald-200",
    rejected: "border-red-800 text-red-200",
    escalated: "border-amber-700 text-amber-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${styles[
        normalized as BackOfficeStatus
      ]}`}
    >
      {normalized}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: string | null }) {
  const normalized =
    decision && decisionActions.includes(decision as DecisionAction)
      ? decision
      : "manual_review";

  return (
    <span className="inline-flex rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
      {normalized}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-500">{label}</p>;
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminAllowlisted(user.email) || !(await hasAdminVerifiedCookie())) {
    redirect("/admin/access");
  }

  const [
    waitlist,
    verificationCases,
    passports,
    trustReports,
    signals,
    auditLogs,
    evidenceFiles,
    decisions,
    riskScores,
  ] = await Promise.all([
    fetchTable<WaitlistEntry>(
      supabase,
      "waitlist",
      "id,email,company,role,use_case,created_at"
    ),
    fetchTable<VerificationCase>(
      supabase,
      "verification_cases",
      "id,subject_name,subject_type,status,verification_status,human_presence_index,origin_trace_score,trust_score,reviewed_by,created_at"
    ),
    fetchTable<Passport>(
      supabase,
      "passports",
      "*"
    ),
    fetchTable<TrustReport>(
      supabase,
      "trust_reports",
      "*"
    ),
    fetchTable<Signal>(supabase, "signals", "id,event,created_at"),
    fetchTable<AuditLog>(
      supabase,
      "audit_logs",
      "id,event_type,actor,created_at"
    ),
    fetchTable<EvidenceFile>(
      supabase,
      "evidence_files",
      "id,verification_case_id,file_name,scan_status,created_at"
    ),
    fetchTable<Decision>(
      supabase,
      "decisions",
      "id,verification_case_id,decision,status,created_at"
    ),
    fetchTable<RiskScore>(
      supabase,
      "risk_scores",
      "id,verification_case_id,score,risk_level,created_at"
    ),
  ]);

  const metrics = [
    {
      label: "Waitlist",
      value: waitlist.count,
      available: waitlist.available,
      href: "/admin",
    },
    {
      label: "Verification Cases",
      value: verificationCases.count,
      available: verificationCases.available,
      href: "/verification-queue",
    },
    {
      label: "Passports",
      value: passports.count,
      available: passports.available,
      href: "/admin",
    },
    {
      label: "Trust Reports",
      value: trustReports.count,
      available: trustReports.available,
      href: "/admin",
    },
    {
      label: "Signals",
      value: signals.count,
      available: signals.available,
      href: "/signals",
    },
    {
      label: "Audit Logs",
      value: auditLogs.count,
      available: auditLogs.available,
      href: "/trust-timeline",
    },
    {
      label: "Evidence",
      value: evidenceFiles.count,
      available: evidenceFiles.available,
      href: "/evidence-vault",
    },
    {
      label: "Decisions",
      value: decisions.count,
      available: decisions.available,
      href: "/decision-engine",
    },
    {
      label: "Risk Scores",
      value: riskScores.count,
      available: riskScores.available,
      href: "/trust-prediction",
    },
    {
      label: "Billing / Clearances",
      value: "Ready",
      available: true,
      href: "/billing",
    },
    {
      label: "Step-Up Requests",
      value: signals.rows.filter((signal) =>
        /step_up|permission_step_up|agent_permission_escalated/i.test(
          signal.event
        )
      ).length,
      available: signals.available,
      href: "/step-up-verification",
    },
    {
      label: "Revocations",
      value: signals.rows.filter((signal) =>
        /revoked|restricted|paused|locked|expired|revocation/i.test(
          signal.event
        )
      ).length,
      available: signals.available,
      href: "/revocation-engine",
    },
    {
      label: "Recovery Queue",
      value: signals.rows.filter((signal) =>
        /recovery|restored/i.test(signal.event)
      ).length,
      available: signals.available,
      href: "/trust-recovery",
    },
    {
      label: "Compliance Exports",
      value: signals.rows.filter((signal) =>
        /compliance_export|trust_report|audit_pack|report_exported/i.test(
          signal.event
        )
      ).length,
      available: signals.available,
      href: "/compliance-export",
    },
  ];
  const radarSignals = normalizeSignals(signals.rows).slice(0, 5);
  const prediction = predictTrustRisk({
    passports: passports.rows,
    signals: signals.rows,
    auditLogs: auditLogs.rows,
    decisions: decisions.rows as PredictionInputDecision[],
    fabricActivity: signals.count + auditLogs.count + decisions.count,
  });
  const trustFabric = evaluateTrustFabric({
    active_nodes:
      passports.count +
      verificationCases.count +
      signals.count +
      decisions.count +
      evidenceFiles.count,
    humans: passports.rows.filter((passport) => passport.subject_type === "human")
      .length,
    agents: passports.rows.filter((passport) => passport.subject_type === "agent")
      .length,
    signals: signals.count,
    decisions: decisions.count,
    evidence: evidenceFiles.count,
    relationships: signals.count + auditLogs.count + decisions.count,
    global_activity: signals.count + auditLogs.count,
  });
  const linkedInReviewQueue = [
    ...passports.rows.map((passport) => ({
      id: `passport-${passport.id}`,
      subject_name: passport.subject_name,
      linkedin_url: passport.linkedin_url,
      status: passport.linkedin_verification_status ?? "unverified",
      claimed_company: passport.linkedin_claimed_company,
      claimed_role: passport.linkedin_claimed_role,
      review_required: Boolean(passport.linkedin_review_required),
    })),
    ...trustReports.rows.map((report) => ({
      id: `report-${report.id}`,
      subject_name: report.candidate_name ?? "Unnamed candidate",
      linkedin_url: report.linkedin_url,
      status: report.linkedin_verification_status ?? "unverified",
      claimed_company: report.linkedin_claimed_company,
      claimed_role: report.linkedin_claimed_role,
      review_required: Boolean(report.linkedin_review_required),
    })),
  ].filter(
    (item) =>
      item.linkedin_url &&
      (item.review_required ||
        ["submitted", "manual_review", "mismatch"].includes(item.status))
  );
  const verificationQueuePreview = verificationCases.rows
    .filter((item) =>
      ["pending", "in_review", "escalated"].includes(
        item.verification_status ?? item.status ?? "pending"
      )
    )
    .slice(0, 4);
  const stepUpRequests = signals.rows
    .filter((signal) =>
      /step_up|permission_step_up|agent_permission_escalated/i.test(
        signal.event
      )
    )
    .slice(0, 4);
  const revocationEvents = signals.rows
    .filter((signal) =>
      /revoked|restricted|paused|locked|expired|revocation/i.test(
        signal.event
      )
    )
    .slice(0, 4);
  const recoveryEvents = signals.rows
    .filter((signal) => /recovery|restored/i.test(signal.event))
    .slice(0, 4);
  const complianceExportEvents = signals.rows
    .filter((signal) =>
      /compliance_export|trust_report|audit_pack|report_exported/i.test(
        signal.event
      )
    )
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <SessionGuard />
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-8">
          <h1 className="text-4xl font-bold">Triple-Secure Back Office</h1>
          <p className="mt-2 text-sm font-medium text-emerald-300">
            Authenticated. Allowlisted. Step-up verified.
          </p>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Review evidence, verify human presence, inspect origin traces and
            approve or escalate trust decisions.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Every decision creates a signal and audit event.
          </p>
          <Link
            href="/trust-timeline"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            View Trust History
          </Link>
          <Link
            href="/trust-graph"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Trust Graph
          </Link>
          <Link
            href="/trust-prediction"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Prediction Engine
          </Link>
          <Link
            href="/verification-queue"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Verification Queue
          </Link>
          <Link
            href="/decision-engine"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Decision Engine
          </Link>
          <Link
            href="/policy-engine"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Policy Engine
          </Link>
          <Link
            href="/evidence-vault"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Evidence Vault
          </Link>
          <Link
            href="/api-docs"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open API Docs
          </Link>
          <Link
            href="/developer-console"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Developer Console
          </Link>
          <Link
            href="/billing"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Billing / Clearances
          </Link>
          <Link
            href="/global-trust"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Global Infrastructure
          </Link>
          <Link
            href="/mission-control"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Mission Control
          </Link>
          <Link
            href="/launch-console"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Launch Console
          </Link>
          <Link
            href="/qa-console"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open QA Console
          </Link>
          <Link
            href="/agent-registry"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Agent Registry
          </Link>
          <Link
            href="/permissions-firewall"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Permissions Firewall
          </Link>
          <Link
            href="/step-up-verification"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Step-Up Verification
          </Link>
          <Link
            href="/revocation-engine"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Revocation Engine
          </Link>
          <Link
            href="/trust-recovery"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Trust Recovery
          </Link>
          <Link
            href="/compliance-export"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Compliance Export
          </Link>
          <Link
            href="/client-portal"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            View Client Portal
          </Link>
          <Link
            href="/team-workspace"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            View Team Workspace
          </Link>
          <Link
            href="/team-access"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Team Access
          </Link>
          <Link
            href="/verifier-network"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Verifier Network
          </Link>
          <Link
            href="/marketplace-trust"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Marketplace Trust
          </Link>
          <Link
            href="/trust-badges"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Trust Badges
          </Link>
          <Link
            href="/verify"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Public Verification
          </Link>
          <Link
            href="/profile"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Public Profiles
          </Link>
          <Link
            href="/trust-ledger"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Trust Ledger
          </Link>
          <Link
            href="/reality-os"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Reality OS
          </Link>
          <Link
            href="/trust-fabric"
            className="ml-3 mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Trust Fabric
          </Link>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              {!metric.available ? (
                <p className="mt-1 text-xs text-zinc-600">Table unavailable</p>
              ) : null}
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Ledger</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Ledger rows explain score changes, decisions, revocations,
                recoveries, evidence updates and verification outcomes.
              </p>
            </div>
            <Link
              href="/trust-ledger"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Ledger
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {demoTrustLedgerEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">{event.event_type}</p>
                <p className="mt-2 text-lg font-semibold">
                  {event.previous_value ?? "new"} -&gt; {event.new_value ?? "n/a"}
                </p>
                <p className="mt-2 text-xs text-zinc-600">{event.reason_code}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                Global Infrastructure Readiness
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                Cyber Sentinels is moving from prototype toward secure global
                trust infrastructure with regional controls, encrypted evidence,
                API governance, media processing queues and audit-ready exports.
              </p>
            </div>
            <Link
              href="/global-trust"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              View Readiness
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              "secure_media_processing",
              "encrypted_evidence_storage",
              "audit_immutability_layer",
              "api_gateway",
              "regional_data_controls",
              "compliance_exports",
            ].map((item) => (
              <code
                key={item}
                className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                {item}
              </code>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Step-Up Requests</h2>
              <p className="mt-2 text-sm text-zinc-500">
                High-risk actions waiting for stronger proof, admin approval or
                manual review.
              </p>
            </div>
            <Link
              href="/step-up-verification"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Step-Up Verification
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {stepUpRequests.length ? (
              stepUpRequests.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{signal.event}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(signal.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No live step-up requests. Demo requests are available in Step-Up Verification." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Revocation Panel</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Trust reversals, restricted agents, paused API keys and locked
                evidence requiring admin attention.
              </p>
            </div>
            <Link
              href="/revocation-engine"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Revocation Engine
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {revocationEvents.length ? (
              revocationEvents.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{signal.event}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(signal.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No live revocation events. Demo reversals are available in Revocation Engine." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recovery Queue</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Appeals and restoration requests requiring evidence, step-up or
                admin review.
              </p>
            </div>
            <Link
              href="/trust-recovery"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Recovery
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recoveryEvents.length ? (
              recoveryEvents.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{signal.event}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(signal.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No live recovery requests. Demo appeals are available in Trust Recovery." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Compliance Export</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Audit-ready report packs for customers, regulators and internal
                review.
              </p>
            </div>
            <Link
              href="/compliance-export"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Export Center
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {complianceExportEvents.length ? (
              complianceExportEvents.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{signal.event}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(signal.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No live compliance exports. Demo report packs are available in Compliance Export." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Team Workspace Preview</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Shared operations for team-owned passports, cases, reports, API
                keys, billing and admin decisions.
              </p>
            </div>
            <Link
              href="/team-workspace"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Team Workspace
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Team roles", "owner / admin / reviewer"],
              ["Permissions", "review_cases / manage_api_keys"],
              ["Plan", "Teams placeholder"],
              ["Data key", "team_id"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-zinc-200">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Verifier Network</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Approved reviewers and trust partners for distributed case
                review, escalation and export workflows.
              </p>
            </div>
            <Link
              href="/verifier-network"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Verifier Network
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Verifier types", "internal / partner / reviewer"],
              ["Status", "pending / approved / suspended"],
              ["Assignments", "case_assigned_to_verifier"],
              ["Admin rule", "future approval only"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-zinc-200">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Badge Verification</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Public-safe badge checks for marketplaces, client portals and
                trust partners.
              </p>
            </div>
            <Link
              href="/trust-badges"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Badges
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["API", "/api/badges/verify"],
              ["Signal", "trust_badge_verified"],
              ["Audit", "trust_badge_verified"],
              ["Security", "public-safe summary"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-zinc-200">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Public Profile Preview</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Shareable public trust profiles for humans, candidates, agents,
                companies, creators and verifiers.
              </p>
            </div>
            <Link
              href="/profile"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Public Profiles
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["API", "/api/public/profile/[id]"],
              ["Signal", "public_profile_viewed"],
              ["Audit", "public_profile_viewed"],
              ["Security", "no private evidence"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-zinc-200">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Waitlist Entries</h2>
          <div className="mt-5 grid gap-3">
            {waitlist.rows.length ? (
              waitlist.rows.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-800 p-4"
                >
                  <p className="font-medium text-zinc-100">{entry.email}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {[entry.company, entry.role, entry.use_case]
                      .filter(Boolean)
                      .join(" / ") || "No details supplied"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No waitlist entries." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Verification Queue</h2>
          <div className="mt-5 grid gap-3">
            {verificationCases.rows.length ? (
              verificationCases.rows.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {item.subject_name ?? "Unnamed subject"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.subject_type ?? "unknown"} / {formatDate(item.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={item.verification_status ?? item.status} />
                  </div>
                  <AdminVerificationActions caseId={item.id} />
                </div>
              ))
            ) : (
              <EmptyState
                label={
                  verificationCases.available
                    ? "No verification cases."
                    : "verification_cases table is not available yet."
                }
              />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                Verification Operations Queue Preview
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Live cases waiting for human review, escalation or evidence.
              </p>
            </div>
            <Link
              href="/verification-queue"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Queue
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {verificationQueuePreview.length ? (
              verificationQueuePreview.map((item) => (
                <div
                  key={`queue-preview-${item.id}`}
                  className="rounded-lg border border-zinc-800 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {item.subject_name ?? "Unnamed subject"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.subject_type ?? "unknown"} / Trust{" "}
                        {item.trust_score ?? "n/a"}
                      </p>
                    </div>
                    <StatusBadge status={item.verification_status ?? item.status} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-500">
                    HPI {item.human_presence_index ?? "n/a"} / Origin{" "}
                    {item.origin_trace_score ?? "n/a"} / Reviewer{" "}
                    {item.reviewed_by ?? "Unassigned"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No active verification work in queue." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Fabric</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Connected trust signals across passports, evidence, decisions,
                audits and operational relationships.
              </p>
            </div>
            <Link
              href="/trust-fabric"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Fabric
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Active Nodes", trustFabric.active_nodes],
              ["Signals", trustFabric.signals],
              ["Relationships", trustFabric.relationships],
              ["Health", trustFabric.health],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Prediction Panel</h2>
              <p className="mt-2 text-sm text-zinc-500">
                {prediction.trend}
              </p>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {prediction.state}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">Prediction Score</p>
              <p className="mt-2 text-3xl font-semibold">{prediction.score}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">Risk Direction</p>
              <p className="mt-2 text-3xl font-semibold capitalize">
                {prediction.riskDirection}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">Recommended Action</p>
              <p className="mt-2 text-lg font-semibold">
                {prediction.recommendedActions[0]}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">LinkedIn Review Queue</h2>
          <p className="mt-2 text-sm text-zinc-500">
            LinkedIn is one signal, not the source of truth.
          </p>
          <div className="mt-5 grid gap-3">
            {linkedInReviewQueue.length ? (
              linkedInReviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-lg border border-zinc-800 p-4 lg:grid-cols-[1fr_1.4fr_0.8fr_1fr_0.8fr]"
                >
                  <div>
                    <p className="text-sm text-zinc-500">Subject</p>
                    <p className="mt-1 font-medium text-zinc-100">
                      {item.subject_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">LinkedIn URL</p>
                    <p className="mt-1 break-all text-sm text-zinc-300">
                      {item.linkedin_url}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Status</p>
                    <p className="mt-1 text-zinc-300">{item.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Claimed role/company</p>
                    <p className="mt-1 text-zinc-300">
                      {[item.claimed_role, item.claimed_company]
                        .filter(Boolean)
                        .join(" / ") || "Not supplied"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Review required</p>
                    <p className="mt-1 text-zinc-300">
                      {item.review_required ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No LinkedIn profiles awaiting review." />
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Passports</h2>
            <div className="mt-5 space-y-3">
              {passports.rows.length ? (
                passports.rows.map((passport) => (
                  <div key={passport.id} className="rounded-lg border border-zinc-800 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{passport.subject_name}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {passport.subject_type} / Trust {passport.trust_score ?? "n/a"}
                        </p>
                      </div>
                      <StatusBadge status={passport.review_status} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState label="No recent passports." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Trust Reports</h2>
            <div className="mt-5 space-y-3">
              {trustReports.rows.length ? (
                trustReports.rows.map((report) => (
                  <div key={report.id} className="rounded-lg border border-zinc-800 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {report.candidate_name ?? "Unnamed candidate"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {report.report_type ?? "trust_report"} / Trust{" "}
                          {report.trust_score ?? "n/a"}
                        </p>
                      </div>
                      <StatusBadge status={report.review_status} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState label="No recent trust reports." />
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Signals</h2>
            <div className="mt-5 space-y-3">
              {signals.rows.length ? (
                signals.rows.map((signal) => (
                  <div key={signal.id} className="rounded-lg border border-zinc-800 p-4">
                    <p className="text-zinc-300">{signal.event}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(signal.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No recent signals." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Recent Radar Activity</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Signal detected / Trust state changed / Reality status updated
                </p>
              </div>
              <Link
                href="/trust-radar"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Radar
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {radarSignals.map((signal, index) => (
                <div
                  key={signal.id}
                  className={`rounded-lg border border-zinc-800 p-4 ${
                    index === 0 ? "animate-pulse" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {signal.isDemo ? "Demo Signal" : signal.source_type}
                      </p>
                      <p className="mt-2 text-zinc-300">{signal.event}</p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                      {signal.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatTimeAgo(signal.created_at)} / {signal.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Audit Logs</h2>
            <div className="mt-5 space-y-3">
              {auditLogs.rows.length ? (
                auditLogs.rows.map((log) => (
                  <div key={log.id} className="rounded-lg border border-zinc-800 p-4">
                    <p className="text-zinc-300">{log.event_type}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {log.actor ?? "system"} / {formatDate(log.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No recent audit logs." />
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Pending Scan</h2>
            <div className="mt-5 space-y-3">
              {evidenceFiles.rows.length ? (
                evidenceFiles.rows
                  .filter((file) => file.scan_status !== "clean")
                  .map((file) => (
                    <div key={file.id} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium">
                        {file.file_name ?? "Evidence file"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {file.scan_status ?? "pending"}
                      </p>
                    </div>
                  ))
              ) : (
                <EmptyState
                  label={
                    evidenceFiles.available
                      ? "No evidence pending scan."
                      : "evidence_files table is not available yet."
                  }
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Decision Queue</h2>
            <div className="mt-5 space-y-3">
              {decisions.rows.length ? (
                decisions.rows.map((decision) => (
                  <div key={decision.id} className="rounded-lg border border-zinc-800 p-4">
                    <div className="flex flex-wrap gap-2">
                      <DecisionBadge decision={decision.decision} />
                      <StatusBadge status={decision.status} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(decision.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  label={
                    decisions.available
                      ? "No decisions recorded."
                      : "decisions table is not available yet."
                  }
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Risk Overview</h2>
            <div className="mt-5 space-y-3">
              {riskScores.rows.length ? (
                riskScores.rows.map((risk) => (
                  <div key={risk.id} className="rounded-lg border border-zinc-800 p-4">
                    <p className="font-medium">
                      Score {risk.score ?? "n/a"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {risk.risk_level ?? "unclassified"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  label={
                    riskScores.available
                      ? "No risk scores."
                      : "risk_scores table is not available yet."
                  }
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
