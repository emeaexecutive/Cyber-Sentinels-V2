import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateTrustScoreV1,
  getTrustScoreReasonTone,
} from "@/lib/trust-score-engine";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type PassportViewerPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: unknown) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fieldValue(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function rowDate(row: AnyRow) {
  return String(row.created_at ?? row.updated_at ?? "");
}

function metadata(row: AnyRow) {
  const value = row.metadata;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isRelatedEvent(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const rowMetadata = metadata(row);
  const metadataPassportId = String(rowMetadata.passport_id ?? "");
  const metadataCaseId = String(rowMetadata.verification_case_id ?? "");

  return (
    metadataPassportId === passportId ||
    (metadataCaseId ? caseIds.has(metadataCaseId) : false)
  );
}

function sortNewestFirst(rows: AnyRow[]) {
  return [...rows].sort(
    (left, right) =>
      new Date(rowDate(right)).getTime() - new Date(rowDate(left)).getTime()
  );
}

function StatusChip({ value }: { value?: unknown }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-100">
      {fieldValue(value)}
    </span>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-medium text-zinc-100">
        {fieldValue(value)}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-500">{label}</p>;
}

function evidenceUrl(item: AnyRow) {
  return item.public_url ?? item.file_url ?? item.evidence_url;
}

function ReasonCodeChip({ reason }: { reason: string }) {
  const tone = getTrustScoreReasonTone(reason);
  const styles = {
    positive: "border-emerald-800 bg-emerald-950/30 text-emerald-200",
    warning: "border-amber-800 bg-amber-950/30 text-amber-200",
    danger: "border-red-900 bg-red-950/30 text-red-200",
  };
  const icon = tone === "positive" ? "✓" : "!";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${styles[tone]}`}
    >
      <span aria-hidden="true">{icon}</span>
      {reason}
    </span>
  );
}

export default async function PassportViewerPage({
  params,
}: PassportViewerPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/passports/${encodeURIComponent(id)}`);
  }

  const { data: passport } = await supabase
    .from("passports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!passport) {
    return (
      <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/passports" className="text-sm text-zinc-400 hover:text-white">
            Back to Trust Passports
          </Link>
          <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h1 className="text-3xl font-semibold">Passport not found</h1>
            <p className="mt-3 text-sm text-zinc-500">
              No trust passport exists for this ID.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const [
    { data: verificationCases },
    { data: evidenceFiles },
    { data: stateChecks },
    { data: executionPassports },
  ] =
    await Promise.all([
      supabase
        .from("verification_cases")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("evidence_files")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("passport_state_checks")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("execution_passports")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => String(item.id)));
  const evidence = evidenceFiles ?? [];
  const passportStateChecks = stateChecks ?? [];
  const passportExecutions = executionPassports ?? [];

  const decisionQueries = [
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false }),
  ];

  if (caseIds.size) {
    decisionQueries.push(
      supabase
        .from("decisions")
        .select("*")
        .in("verification_case_id", [...caseIds])
        .order("created_at", { ascending: false })
    );
  }

  const [{ data: signalRows }, { data: auditRows }, ...decisionResults] =
    await Promise.all([
      supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      ...decisionQueries,
    ]);

  const decisionsById = new Map<string, AnyRow>();
  decisionResults.forEach((result) => {
    (result.data ?? []).forEach((decision) => {
      decisionsById.set(String(decision.id), decision);
    });
  });
  const decisions = sortNewestFirst([...decisionsById.values()]);
  const latestVerification = cases[0];
  const relatedSignals = sortNewestFirst(
    (signalRows ?? []).filter((row) => isRelatedEvent(row, id, caseIds))
  );
  const relatedAuditLogs = sortNewestFirst(
    (auditRows ?? []).filter((row) => isRelatedEvent(row, id, caseIds))
  );
  const displayedSignals = relatedSignals.length
    ? relatedSignals
    : (signalRows ?? []).slice(0, 5);
  const displayedAuditLogs = relatedAuditLogs.length
    ? relatedAuditLogs
    : (auditRows ?? []).slice(0, 5);
  const passportStatus =
    passport.verification_status ??
    passport.review_status ??
    passport.reality_passport_status;
  const trustScore = calculateTrustScoreV1({
    passport,
    evidence,
    decisions,
    auditLogs: relatedAuditLogs,
    signals: relatedSignals,
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-950 to-[#06111d] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
                Trust Passport Viewer
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-semibold md:text-6xl">
                  {fieldValue(passport.subject_name, "Unnamed passport")}
                </h1>
                <StatusChip value={passportStatus} />
                <span className="inline-flex rounded-full border border-emerald-800/70 bg-emerald-950/20 px-3 py-1 text-xs text-emerald-100">
                  {trustScore.score} / {trustScore.confidenceLabel}
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                This passport is not a static identity record. It is an
                evidence-backed trust timeline.
              </p>
              <p className="mt-3 break-all text-xs text-zinc-600">{id}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/passport"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                Start Verification
              </Link>
              <Link
                href={`/evidence-upload${
                  latestVerification?.id
                    ? `?case=${encodeURIComponent(String(latestVerification.id))}`
                    : ""
                }`}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
              >
                Upload Evidence
              </Link>
              <Link
                href="#audit-timeline"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
              >
                View Audit Trail
              </Link>
              <Link
                href={`/trust-graph-explorer?passport_id=${encodeURIComponent(id)}`}
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                Open Trust Graph
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <InfoTile label="Passport ID" value={passport.id} />
          <InfoTile label="Name" value={passport.subject_name} />
          <InfoTile
            label="Trust Score"
            value={`${trustScore.score} / ${trustScore.confidenceLabel}`}
          />
          <InfoTile label="Created Date" value={formatDate(passport.created_at)} />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Trust Score Engine V1
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-zinc-100">
                {trustScore.score}
              </h2>
              <p className="mt-1 text-sm text-cyan-200">
                {trustScore.confidenceLabel}
              </p>
            </div>
            <div className="max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-600">
                Reason Codes
              </p>
              <div className="flex flex-wrap gap-2">
              {(trustScore.reasonCodes.length
                ? trustScore.reasonCodes
                : ["Evidence missing"]
              ).map((reason) => (
                <ReasonCodeChip key={reason} reason={reason} />
              ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Summary</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoTile
                label="Current Status"
                value={
                  latestVerification?.verification_status ??
                  latestVerification?.status ??
                  passport.verification_status
                }
              />
              <InfoTile
                label="Latest Verification Date"
                value={formatDate(
                  latestVerification?.updated_at ?? latestVerification?.created_at
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Narrative</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-400">
              Identity is not trust. This view connects identity, evidence,
              human review, signals and audit events into one defensible record.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Dynamic Trust State
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                State Verification Timeline
              </h2>
            </div>
            <Link
              href="/state-verification"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
            >
              Create State Check
            </Link>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
            Trust changes over time. Static identity is insufficient, so each
            state check records identity, evidence, trust and risk movement.
          </p>
          <div className="mt-5 space-y-3">
            {passportStateChecks.length ? (
              passportStateChecks.map((check, index) => (
                <div
                  key={String(check.id ?? `state-check-${index}`)}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_0.9fr] md:items-center">
                    <div>
                      <p className="text-xs text-zinc-500 md:hidden">
                        Identity State
                      </p>
                      <StatusChip value={check.identity_state} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 md:hidden">
                        Evidence State
                      </p>
                      <StatusChip value={check.evidence_state} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 md:hidden">
                        Trust State
                      </p>
                      <StatusChip value={check.trust_state} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 md:hidden">
                        Risk Movement
                      </p>
                      <StatusChip value={check.risk_movement} />
                    </div>
                    <p className="text-sm text-zinc-400">
                      {formatDate(check.created_at)}
                    </p>
                  </div>
                  {check.notes ? (
                    <p className="mt-4 text-sm leading-6 text-zinc-500">
                      {fieldValue(check.notes)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState label="No state verification checks recorded yet." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Execution Governance
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Execution Passport Timeline
              </h2>
            </div>
            <Link
              href="/execution-passports"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
            >
              Create Execution Passport
            </Link>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
            Approval before execution. Evidence-backed authorization. Every
            high-risk action needs a passport.
          </p>
          <div className="mt-5 space-y-3">
            {passportExecutions.length ? (
              passportExecutions.map((execution, index) => (
                <div
                  key={String(execution.id ?? `execution-${index}`)}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr] xl:items-center">
                    <div>
                      <p className="text-xs text-zinc-500 xl:hidden">
                        Execution Summary
                      </p>
                      <p className="font-medium text-zinc-100">
                        {fieldValue(execution.execution_summary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 xl:hidden">
                        Execution Type
                      </p>
                      <p className="text-sm text-zinc-300">
                        {fieldValue(execution.execution_type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 xl:hidden">
                        Risk Level
                      </p>
                      <StatusChip value={execution.risk_level} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 xl:hidden">Status</p>
                      <StatusChip value={execution.status} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 xl:hidden">
                        Approval Required
                      </p>
                      <p className="text-sm text-zinc-300">
                        {execution.approval_required ? "yes" : "no"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 xl:hidden">
                        Evidence Required
                      </p>
                      <p className="text-sm text-zinc-300">
                        {execution.evidence_required ? "yes" : "no"}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {formatDate(execution.created_at)}
                    </p>
                  </div>
                  {execution.notes ? (
                    <p className="mt-4 text-sm leading-6 text-zinc-500">
                      {fieldValue(execution.notes)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState label="No execution passports recorded yet." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Evidence Chain</h2>
            <span className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
              Evidence Count: {evidence.length}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {evidence.length ? (
              evidence.map((item, index) => (
                <div
                  key={String(item.id ?? `evidence-${index}`)}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[1fr_0.8fr_1fr_auto] md:items-center">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {fieldValue(item.file_name ?? item.file_url, "Evidence file")}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {fieldValue(item.evidence_type ?? item.file_type)}
                      </p>
                    </div>
                    <StatusChip value={item.status ?? item.scan_status} />
                    <p className="text-sm text-zinc-400">
                      {formatDate(item.created_at)}
                    </p>
                    {evidenceUrl(item) ? (
                      <Link
                        href={String(evidenceUrl(item))}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
                      >
                        Open Evidence
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No evidence uploaded yet." />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Decision Chain</h2>
          <div className="mt-5 space-y-3">
            {decisions.length ? (
              decisions.map((decision, index) => (
                <div
                  key={String(decision.id ?? `decision-${index}`)}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {fieldValue(decision.decision, "Decision recorded")}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Actor: {fieldValue(decision.actor ?? decision.decided_by)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Verification Case:{" "}
                        {fieldValue(
                          decision.verification_case_id ?? decision.case_id
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusChip value={decision.status} />
                      <p className="mt-3 text-xs text-zinc-600">
                        {formatDate(decision.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No decisions recorded yet." />
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signal Timeline</h2>
            {relatedSignals.length === 0 && displayedSignals.length ? (
              <p className="mt-3 text-sm text-zinc-500">
                No signals linked yet. Showing recent platform signals.
              </p>
            ) : null}
            <div className="mt-5 space-y-3">
              {displayedSignals.length ? (
                displayedSignals.map((signal, index) => (
                  <div
                    key={String(signal.id ?? `signal-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-200">{fieldValue(signal.event)}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(signal.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No signals linked yet." />
              )}
            </div>
          </div>

          <div id="audit-timeline" className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit Timeline</h2>
            {relatedAuditLogs.length === 0 && displayedAuditLogs.length ? (
              <p className="mt-3 text-sm text-zinc-500">
                No audit events linked yet. Showing recent platform audit events.
              </p>
            ) : null}
            <div className="mt-5 space-y-3">
              {displayedAuditLogs.length ? (
                displayedAuditLogs.map((log, index) => (
                  <div
                    key={String(log.id ?? `audit-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-200">{fieldValue(log.event_type)}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {fieldValue(log.actor)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No audit events linked yet." />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
