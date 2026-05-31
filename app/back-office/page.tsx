import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminVerificationActions } from "@/components/admin-verification-actions";
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

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AnyRow = Record<string, any>;

type TableResult<T> = {
  rows: T[];
  count: number;
  available: boolean;
};

type SupabaseQueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isMissingTableError(error: SupabaseQueryError | null) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    text.includes("could not find the table") ||
    (text.includes("relation") && text.includes("does not exist"))
  );
}

function toTableResult<T>(data: T[] | null, count: number | null) {
  return {
    rows: data ?? [],
    count: count ?? data?.length ?? 0,
    available: true,
  };
}

async function fetchTable<T>(
  supabase: SupabaseServerClient,
  table: string,
  orderColumn = "created_at",
  limit = 8
): Promise<TableResult<T>> {
  const primary = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (!primary.error) {
    return toTableResult(primary.data, primary.count);
  }

  if (isMissingTableError(primary.error)) {
    return { rows: [], count: 0, available: false };
  }

  const broad = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (!broad.error) {
    return toTableResult(broad.data, broad.count);
  }

  if (isMissingTableError(broad.error)) {
    return { rows: [], count: 0, available: false };
  }

  const unordered = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .limit(limit)
    .returns<T[]>();

  if (!unordered.error) {
    return toTableResult(unordered.data, unordered.count);
  }

  return {
    rows: [],
    count: 0,
    available: !isMissingTableError(unordered.error),
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status?: string | null }) {
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

function DecisionBadge({ decision }: { decision?: string | null }) {
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

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "n/a";
}

function AuditPanelItem({
  label,
  row,
  detail,
}: {
  label: string;
  row?: AnyRow;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      {row ? (
        <>
          <p className="mt-2 break-all text-sm font-medium text-zinc-100">
            {shortId(String(row.id ?? ""))}
          </p>
          {detail ? (
            <p className="mt-1 text-sm text-zinc-400">{detail}</p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-600">
            {formatDate(row.created_at)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">No live record yet.</p>
      )}
    </div>
  );
}

function BackOfficeAccessGate({
  email,
  denied,
}: {
  email: string;
  denied?: boolean;
}) {
  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Back Office Access</h1>
          <p className="mt-3 text-zinc-400">
            Enter the admin access code to open Back Office.
          </p>

          <form action="/api/admin/access" method="post" className="mt-6 grid gap-4">
            <p className="text-sm text-emerald-300">
              Logged in as {email}. This account is allowlisted.
            </p>
            <label className="grid gap-2 text-sm text-zinc-400">
              Admin access code
              <input
                name="access_code"
                type="password"
                autoComplete="one-time-code"
                required
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-white p-3 font-semibold text-black"
            >
              Open Back Office
            </button>

            {denied ? (
              <p className="text-sm text-red-300">
                Admin access expired. Re-enter admin code.
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}

function NotAllowlistedGate() {
  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-red-900 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Back Office Access</h1>
          <p className="mt-4 text-sm text-red-300">Not allowlisted.</p>
        </section>
      </div>
    </main>
  );
}

function rowKey(row: AnyRow, fallback: string) {
  return String(row.id ?? fallback);
}

function evidenceStatus(row?: AnyRow) {
  return row?.status ?? row?.scan_status ?? "pending_review";
}

function EvidenceReviewActions({ evidenceId }: { evidenceId: string }) {
  const action = `/api/admin/evidence/${evidenceId}/decision`;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form method="POST" action={action}>
        <input type="hidden" name="decision" value="accept" />
        <button
          type="submit"
          className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400 hover:text-white"
        >
          Accept Evidence
        </button>
      </form>
      <form method="POST" action={action}>
        <input type="hidden" name="decision" value="reject" />
        <button
          type="submit"
          className="rounded-lg border border-red-800 px-3 py-2 text-xs font-medium text-red-200 hover:border-red-500 hover:text-white"
        >
          Reject Evidence
        </button>
      </form>
      <form method="POST" action={action}>
        <input type="hidden" name="decision" value="request_more_evidence" />
        <button
          type="submit"
          className="rounded-lg border border-amber-700 px-3 py-2 text-xs font-medium text-amber-200 hover:border-amber-400 hover:text-white"
        >
          Request More Evidence
        </button>
      </form>
    </div>
  );
}

function tableEmptyLabel(table: string, available: boolean) {
  return available
    ? "No live records yet. Create a Trust Passport or Hiring Shield report to populate this section."
    : `${table} table is not available yet.`;
}

type BackOfficePageProps = {
  searchParams?: Promise<{ denied?: string }>;
};

export default async function BackOfficePage({
  searchParams,
}: BackOfficePageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/back-office");
  }

  if (!isAdminAllowlisted(user.email)) {
    return <NotAllowlistedGate />;
  }

  const params = await searchParams;

  if (!(await hasAdminVerifiedCookie())) {
    return (
      <BackOfficeAccessGate
        email={user.email ?? user.id}
        denied={params?.denied === "1"}
      />
    );
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
    fetchTable<AnyRow>(supabase, "waitlist"),
    fetchTable<AnyRow>(supabase, "verification_cases"),
    fetchTable<AnyRow>(supabase, "passports"),
    fetchTable<AnyRow>(supabase, "trust_reports"),
    fetchTable<AnyRow>(supabase, "signals"),
    fetchTable<AnyRow>(supabase, "audit_logs"),
    fetchTable<AnyRow>(supabase, "evidence_files", "created_at", 100),
    fetchTable<AnyRow>(supabase, "decisions", "created_at", 10),
    fetchTable<AnyRow>(supabase, "risk_scores"),
  ]);

  const metrics = [
    {
      label: "Waitlist",
      value: waitlist.count,
      available: waitlist.available,
      href: "/back-office",
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
      href: "/back-office",
    },
    {
      label: "Trust Reports",
      value: trustReports.count,
      available: trustReports.available,
      href: "/back-office",
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
          signal.event ?? ""
        )
      ).length,
      available: signals.available,
      href: "/step-up-verification",
    },
    {
      label: "Revocations",
      value: signals.rows.filter((signal) =>
        /revoked|restricted|paused|locked|expired|revocation/i.test(
          signal.event ?? ""
        )
      ).length,
      available: signals.available,
      href: "/revocation-engine",
    },
    {
      label: "Recovery Queue",
      value: signals.rows.filter((signal) =>
        /recovery|restored/i.test(signal.event ?? "")
      ).length,
      available: signals.available,
      href: "/trust-recovery",
    },
    {
      label: "Compliance Exports",
      value: signals.rows.filter((signal) =>
        /compliance_export|trust_report|audit_pack|report_exported/i.test(
          signal.event ?? ""
        )
      ).length,
      available: signals.available,
      href: "/compliance-export",
    },
  ];
  const radarSignals = normalizeSignals(
    signals.rows as Parameters<typeof normalizeSignals>[0]
  ).slice(0, 5);
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
      subject_name: passport.subject_name ?? "Unnamed subject",
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
  const pendingVerificationCases = verificationCases.rows
    .filter((item) =>
      ["pending"].includes(
        item.verification_status ?? item.status ?? "pending"
      )
    );
  const stepUpRequests = signals.rows
    .filter((signal) =>
      /step_up|permission_step_up|agent_permission_escalated/i.test(
        signal.event ?? ""
      )
    )
    .slice(0, 4);
  const revocationEvents = signals.rows
    .filter((signal) =>
      /revoked|restricted|paused|locked|expired|revocation/i.test(
        signal.event ?? ""
      )
    )
    .slice(0, 4);
  const recoveryEvents = signals.rows
    .filter((signal) => /recovery|restored/i.test(signal.event ?? ""))
    .slice(0, 4);
  const complianceExportEvents = signals.rows
    .filter((signal) =>
      /compliance_export|trust_report|audit_pack|report_exported/i.test(
        signal.event ?? ""
      )
    )
    .slice(0, 4);
  const pendingEvidenceFiles = evidenceFiles.rows.filter(
    (file) => evidenceStatus(file) !== "clean"
  );
  const evidenceByCase = new Map<string, AnyRow[]>();

  evidenceFiles.rows.forEach((file) => {
    if (!file.verification_case_id) {
      return;
    }

    const caseId = String(file.verification_case_id);
    const current = evidenceByCase.get(caseId) ?? [];
    current.push(file);
    evidenceByCase.set(caseId, current);
  });

  const latestDecision = decisions.rows[0];
  const latestVerificationCase = verificationCases.rows[0];
  const latestPassport = passports.rows[0];
  const latestSignal = signals.rows[0];
  const latestAuditLog = auditLogs.rows[0];

  const kpiMetrics = metrics.filter((metric) =>
    [
      "Verification Cases",
      "Passports",
      "Trust Reports",
      "Signals",
      "Audit Logs",
      "Decisions",
    ].includes(metric.label)
  );
  const moduleLinks = [
    ["Mission Control", "/mission-control"],
    ["Verification Queue", "/verification-queue"],
    ["Evidence Vault", "/evidence-vault"],
    ["Decision Engine", "/decision-engine"],
    ["Launch Console", "/launch-console"],
    ["Trust History", "/trust-timeline"],
    ["Trust Graph", "/trust-graph"],
    ["Prediction Engine", "/trust-prediction"],
    ["Policy Engine", "/policy-engine"],
    ["API Docs", "/api-docs"],
    ["Developer Console", "/developer-console"],
    ["Billing / Clearances", "/billing"],
    ["Global Infrastructure", "/global-trust"],
    ["QA Console", "/qa-console"],
    ["Agent Registry", "/agent-registry"],
    ["Permissions Firewall", "/permissions-firewall"],
    ["Step-Up Verification", "/step-up-verification"],
    ["Revocation Engine", "/revocation-engine"],
    ["Trust Recovery", "/trust-recovery"],
    ["Compliance Export", "/compliance-export"],
    ["Client Portal", "/client-portal"],
    ["Team Workspace", "/team-workspace"],
    ["Team Access", "/team-access"],
    ["Verifier Network", "/verifier-network"],
    ["Marketplace Trust", "/marketplace-trust"],
    ["Trust Badges", "/trust-badges"],
    ["Public Verification", "/verify"],
    ["Public Profiles", "/profile"],
    ["Trust Ledger", "/trust-ledger"],
    ["Reality OS", "/reality-os"],
    ["Trust Fabric", "/trust-fabric"],
  ];

  return (
    <main id="top" className="min-h-screen bg-black pb-16 text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/back-office" className="text-sm font-semibold text-white">
            Cyber Sentinels Back Office
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
            <form action="/api/auth/logout" method="POST">
              <button
                className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white"
                type="submit"
              >
                Logout
              </button>
            </form>
            <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" href="/mission-control">
              Mission Control
            </Link>
            <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" href="/verification-queue">
              Verification Queue
            </Link>
            <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" href="/evidence-vault">
              Evidence Vault
            </Link>
            <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" href="/evidence-upload">
              Upload Evidence
            </Link>
            <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" href="/decision-engine">
              Decision Engine
            </Link>
            <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" href="/launch-console">
              Launch Console
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              Authenticated. Allowlisted. Step-up verified.
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Back Office
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs text-zinc-300">
            <a href="#operations" className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white">
              Operations
            </a>
            <a href="#activity" className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white">
              Activity
            </a>
            <a href="#modules" className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white">
              Modules
            </a>
          </nav>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {kpiMetrics.map((metric) => (
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Decision Pipeline Audit</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Latest live records ordered by created_at desc.
              </p>
            </div>
            <span className="rounded-full border border-emerald-700 px-3 py-1 text-xs text-emerald-200">
              Supabase live
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <AuditPanelItem
              label="Latest Decision"
              row={latestDecision}
              detail={[
                latestDecision?.decision,
                latestDecision?.status,
                latestDecision?.actor,
                latestDecision?.verification_case_id,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <AuditPanelItem
              label="Latest Verification Case"
              row={latestVerificationCase}
              detail={[
                latestVerificationCase?.subject_name,
                latestVerificationCase?.verification_status ??
                  latestVerificationCase?.status,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <AuditPanelItem
              label="Latest Passport Update"
              row={latestPassport}
              detail={[
                latestPassport?.subject_name,
                latestPassport?.verification_status ??
                  latestPassport?.review_status,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <AuditPanelItem
              label="Latest Signal"
              row={latestSignal}
              detail={latestSignal?.event}
            />
            <AuditPanelItem
              label="Latest Audit Event"
              row={latestAuditLog}
              detail={[
                latestAuditLog?.event_type,
                latestAuditLog?.actor,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
          </div>
        </section>

        <section id="operations" className="mt-8 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Operations</h2>
            <div className="flex flex-wrap gap-2">
            <Link
              href="/verification-queue"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Full Queue
            </Link>
              <Link
                href="/evidence-upload"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Upload Evidence
              </Link>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Verification Queue</h3>
              <div className="mt-5 space-y-3">
                {pendingVerificationCases.length ? (
                  pendingVerificationCases.map((item, index) => {
                    const caseEvidence =
                      evidenceByCase.get(String(item.id)) ?? [];
                    const latestEvidence = caseEvidence[0];

                    return (
                      <div key={rowKey(item, `verification-case-${index}`)} className="rounded-lg border border-zinc-800 p-4">
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
                        <div className="mt-3 rounded-lg border border-zinc-900 bg-black p-3 text-xs text-zinc-500">
                          <p className="font-medium text-zinc-300">
                            Evidence: {caseEvidence.length}
                          </p>
                          {latestEvidence ? (
                            <div className="mt-3 space-y-3">
                              {caseEvidence.map((evidence, evidenceIndex) => (
                                <div
                                  key={rowKey(
                                    evidence,
                                    `case-evidence-${index}-${evidenceIndex}`
                                  )}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium text-zinc-200">
                                        {evidence.file_name ??
                                          evidence.evidence_type ??
                                          "Evidence file"}
                                      </p>
                                      <p className="mt-1 text-zinc-500">
                                        {formatDate(evidence.created_at)}
                                      </p>
                                    </div>
                                    <StatusBadge status={evidenceStatus(evidence)} />
                                  </div>
                                  <div className="mt-2 grid gap-1 text-zinc-500">
                                    <p>
                                      Type:{" "}
                                      {evidence.file_type ??
                                        evidence.evidence_type ??
                                        evidence.media_type ??
                                        "unknown"}
                                    </p>
                                    <p>Uploaded: {formatDate(evidence.created_at)}</p>
                                  </div>
                                  {evidence.notes ? (
                                    <p className="mt-2 text-zinc-500">
                                      {evidence.notes}
                                    </p>
                                  ) : null}
                                  {evidence.public_url || evidence.file_url ? (
                                    <Link
                                      href={String(
                                        evidence.public_url ?? evidence.file_url
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-3 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                                    >
                                      Open Evidence
                                    </Link>
                                  ) : null}
                                  {evidence.id ? (
                                    <EvidenceReviewActions
                                      evidenceId={String(evidence.id)}
                                    />
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1">No evidence uploaded yet.</p>
                          )}
                        </div>
                        {item.id ? (
                          <AdminVerificationActions caseId={String(item.id)} />
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState label={tableEmptyLabel("verification_cases", verificationCases.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Pending Decisions</h3>
              <div className="mt-5 space-y-3">
                {decisions.rows.length ? (
                  decisions.rows.map((decision, index) => (
                    <div key={rowKey(decision, `decision-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <div className="flex flex-wrap gap-2">
                        <DecisionBadge decision={decision.decision} />
                        <StatusBadge status={decision.status} />
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">
                        {formatDate(decision.created_at)}
                      </p>
                      <div className="mt-3 grid gap-1 text-xs text-zinc-500">
                        <p>Actor: {decision.actor ?? decision.decided_by ?? "n/a"}</p>
                        <p>
                          Verification Case:{" "}
                          {decision.verification_case_id ??
                            decision.case_id ??
                            "n/a"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("decisions", decisions.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Passports</h3>
              <div className="mt-5 space-y-3">
                {passports.rows.length ? (
                  passports.rows.map((passport, index) => (
                    <div key={rowKey(passport, `passport-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{passport.subject_name ?? "Unnamed subject"}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {passport.subject_type ?? "unknown"} / Trust {passport.trust_score ?? "n/a"}
                          </p>
                        </div>
                        <StatusBadge status={passport.review_status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("passports", passports.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Trust Reports</h3>
              <div className="mt-5 space-y-3">
                {trustReports.rows.length ? (
                  trustReports.rows.map((report, index) => (
                    <div key={rowKey(report, `trust-report-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{report.candidate_name ?? "Unnamed candidate"}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {report.report_type ?? "trust_report"} / Trust {report.trust_score ?? "n/a"}
                          </p>
                        </div>
                        <StatusBadge status={report.review_status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("trust_reports", trustReports.available)} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="activity" className="mt-8 scroll-mt-24">
          <h2 className="mb-4 text-xl font-semibold">Activity</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Signals</h3>
              <div className="mt-5 space-y-3">
                {signals.rows.length ? (
                  signals.rows.map((signal, index) => (
                    <div key={rowKey(signal, `signal-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("signals", signals.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Audit Logs</h3>
              <div className="mt-5 space-y-3">
                {auditLogs.rows.length ? (
                  auditLogs.rows.map((log, index) => (
                    <div key={rowKey(log, `audit-log-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="text-zinc-300">{log.event_type ?? "Audit event"}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {log.actor ?? "system"} / {formatDate(log.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("audit_logs", auditLogs.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Evidence Pending Scan</h3>
              <div className="mt-5 space-y-3">
                {pendingEvidenceFiles.length ? (
                  pendingEvidenceFiles.map((file, index) => (
                    <div key={rowKey(file, `evidence-file-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium">{file.file_name ?? file.evidence_type ?? "Evidence file"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{file.file_type ?? file.evidence_type ?? file.media_type ?? "unknown"} / {evidenceStatus(file)}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Uploaded: {formatDate(file.created_at)}
                      </p>
                      {file.public_url || file.file_url ? (
                        <Link
                          href={String(file.public_url ?? file.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                        >
                          Open Evidence
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("evidence_files", evidenceFiles.available)} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="mt-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <details>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Advanced Modules</h2>
                <span className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                  Show / Hide modules
                </span>
              </div>
            </summary>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {moduleLinks.map(([label, href]) => (
                <Link
                  key={`${label}-${href}`}
                  href={href}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Operational Intelligence</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">Trust Prediction Panel</h3>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  {prediction.state}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{prediction.trend}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">Prediction Score</p>
                  <p className="mt-2 text-3xl font-semibold">{prediction.score}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">Risk Direction</p>
                  <p className="mt-2 text-3xl font-semibold capitalize">{prediction.riskDirection}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">Recommended Action</p>
                  <p className="mt-2 text-lg font-semibold">{prediction.recommendedActions[0]}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Trust Fabric</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Active Nodes", trustFabric.active_nodes],
                  ["Signals", trustFabric.signals],
                  ["Relationships", trustFabric.relationships],
                  ["Health", trustFabric.health],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-zinc-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Radar Activity</h3>
              <div className="mt-5 space-y-3">
                {radarSignals.map((signal, index) => (
                  <div key={signal.id ?? `radar-signal-${index}`} className="rounded-lg border border-zinc-800 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          {signal.isDemo ? "Demo Signal" : signal.source_type}
                        </p>
                        <p className="mt-2 text-zinc-300">{signal.event ?? "Signal recorded"}</p>
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

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Step-Up Requests</h3>
              <div className="mt-5 space-y-3">
                {stepUpRequests.length ? (
                  stepUpRequests.map((signal, index) => (
                    <div key={rowKey(signal, `step-up-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Revocation Panel</h3>
              <div className="mt-5 space-y-3">
                {revocationEvents.length ? (
                  revocationEvents.map((signal, index) => (
                    <div key={rowKey(signal, `revocation-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recovery Queue</h3>
              <div className="mt-5 space-y-3">
                {recoveryEvents.length ? (
                  recoveryEvents.map((signal, index) => (
                    <div key={rowKey(signal, `recovery-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Compliance Export</h3>
              <div className="mt-5 space-y-3">
                {complianceExportEvents.length ? (
                  complianceExportEvents.map((signal, index) => (
                    <div key={rowKey(signal, `compliance-export-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">LinkedIn Review Queue</h3>
              <div className="mt-5 grid gap-3">
                {linkedInReviewQueue.length ? (
                  linkedInReviewQueue.map((item, index) => (
                    <div key={item.id ?? `linkedin-review-${index}`} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium text-zinc-100">{item.subject_name}</p>
                      <p className="mt-1 break-all text-sm text-zinc-300">{item.linkedin_url}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {item.status} / {[item.claimed_role, item.claimed_company].filter(Boolean).join(" / ") || "Not supplied"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Waitlist Entries</h3>
              <div className="mt-5 grid gap-3">
                {waitlist.rows.length ? (
                  waitlist.rows.map((entry, index) => (
                    <div key={rowKey(entry, `waitlist-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium text-zinc-100">{entry.email ?? "Unknown email"}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {[entry.company, entry.role, entry.use_case].filter(Boolean).join(" / ") || "No details supplied"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(entry.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("waitlist", waitlist.available)} />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <a
        href="#top"
        className="fixed bottom-4 right-4 z-50 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 shadow-lg hover:text-white"
      >
        Back to top
      </a>
    </main>
  );
}
