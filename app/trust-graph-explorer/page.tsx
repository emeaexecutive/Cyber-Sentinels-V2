import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type TrustGraphExplorerPageProps = {
  searchParams?: Promise<{ passport_id?: string }>;
};

type MetricResult = {
  table: string;
  label: string;
  count: number;
  available: boolean;
};

type PassportRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  verification_status: string | null;
  review_status: string | null;
  trust_score: number | null;
  created_at: string | null;
};

type GraphNode = {
  id: string;
  type: string;
  title: string;
  status?: unknown;
  createdAt?: unknown;
  href?: string;
};

const metricTables = [
  ["passports", "Passports"],
  ["verification_cases", "Verification Cases"],
  ["evidence_files", "Evidence Files"],
  ["decisions", "Decisions"],
  ["audit_logs", "Audit Events"],
  ["signals", "Signals"],
  ["intent_requests", "Intent Requests"],
  ["autonomy_profiles", "Autonomy Profiles"],
  ["passport_state_checks", "State Checks"],
  ["execution_passports", "Execution Passports"],
];

async function liveCount(table: string, label: string): Promise<MetricResult> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    table,
    label,
    count: count ?? 0,
    available: !error,
  };
}

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

function rowDate(row: AnyRow) {
  return String(row.created_at ?? row.updated_at ?? "");
}

function sortNewestFirst(rows: AnyRow[]) {
  return [...rows].sort(
    (left, right) =>
      new Date(rowDate(right)).getTime() - new Date(rowDate(left)).getTime()
  );
}

function statusValue(row: AnyRow) {
  return (
    row.status ??
    row.verification_status ??
    row.review_status ??
    row.scan_status ??
    row.risk_level ??
    row.trust_state
  );
}

function StatusChip({ value }: { value?: unknown }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
      {fieldValue(value, "linked")}
    </span>
  );
}

function NodeCard({ node }: { node: GraphNode }) {
  const card = (
    <div className="h-full rounded-lg border border-zinc-800 bg-black p-4 transition hover:border-cyan-800/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
            {node.type}
          </p>
          <p className="mt-2 font-medium text-zinc-100">{node.title}</p>
        </div>
        <StatusChip value={node.status} />
      </div>
      <p className="mt-4 text-xs text-zinc-600">{formatDate(node.createdAt)}</p>
    </div>
  );

  if (!node.href) {
    return card;
  }

  return (
    <Link href={node.href} className="block h-full">
      {card}
    </Link>
  );
}

function RelationshipColumn({
  title,
  nodes,
  emptyLabel,
}: {
  title: string;
  nodes: GraphNode[];
  emptyLabel: string;
}) {
  return (
    <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="absolute -left-4 top-1/2 hidden h-px w-4 bg-cyan-900/70 lg:block" />
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-4 grid gap-3">
        {nodes.length ? (
          nodes.map((node) => <NodeCard key={node.id} node={node} />)
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function passportLabel(passport: PassportRow) {
  return fieldValue(passport.subject_name, "Unnamed passport");
}

export default async function TrustGraphExplorerPage({
  searchParams,
}: TrustGraphExplorerPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const [metrics, { data: passports }] = await Promise.all([
    Promise.all(metricTables.map(([table, label]) => liveCount(table, label))),
    supabase
      .from("passports")
      .select(
        "id,subject_name,subject_type,verification_status,review_status,trust_score,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<PassportRow[]>(),
  ]);
  const passportRows = passports ?? [];
  const selectedPassport =
    passportRows.find((passport) => passport.id === params?.passport_id) ??
    passportRows[0];
  const selectedPassportId = selectedPassport?.id ?? "";
  const metricsUnavailable = metrics.some((metric) => !metric.available);

  const [
    { data: verificationCases },
    { data: passportEvidence },
    { data: allSignals },
    { data: allAuditLogs },
    { data: stateChecks },
    { data: executionPassports },
    { data: autonomyProfiles },
  ] = selectedPassportId
    ? await Promise.all([
        supabase
          .from("verification_cases")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(25)
          .returns<AnyRow[]>(),
        supabase
          .from("evidence_files")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
        supabase
          .from("signals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<AnyRow[]>(),
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<AnyRow[]>(),
        supabase
          .from("passport_state_checks")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(25)
          .returns<AnyRow[]>(),
        supabase
          .from("execution_passports")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(25)
          .returns<AnyRow[]>(),
        supabase
          .from("autonomy_profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<AnyRow[]>(),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => String(item.id)));
  const { data: caseEvidence } = caseIds.size
    ? await supabase
        .from("evidence_files")
        .select("*")
        .in("verification_case_id", [...caseIds])
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<AnyRow[]>()
    : { data: [] as AnyRow[] };
  const { data: caseDecisions } = caseIds.size
    ? await supabase
        .from("decisions")
        .select("*")
        .in("verification_case_id", [...caseIds])
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<AnyRow[]>()
    : { data: [] as AnyRow[] };
  const { data: passportDecisions } = selectedPassportId
    ? await supabase
        .from("decisions")
        .select("*")
        .eq("passport_id", selectedPassportId)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<AnyRow[]>()
    : { data: [] as AnyRow[] };

  const evidenceById = new Map<string, AnyRow>();
  [...(passportEvidence ?? []), ...(caseEvidence ?? [])].forEach((item) => {
    evidenceById.set(String(item.id), item);
  });
  const decisionsById = new Map<string, AnyRow>();
  [...(passportDecisions ?? []), ...(caseDecisions ?? [])].forEach((item) => {
    decisionsById.set(String(item.id), item);
  });
  const evidence = sortNewestFirst([...evidenceById.values()]);
  const decisions = sortNewestFirst([...decisionsById.values()]);
  const linkedSignals = sortNewestFirst(
    (allSignals ?? []).filter((row) => isRelatedEvent(row, selectedPassportId, caseIds))
  );
  const linkedAuditLogs = sortNewestFirst(
    (allAuditLogs ?? []).filter((row) => isRelatedEvent(row, selectedPassportId, caseIds))
  );
  const executionRows = executionPassports ?? [];
  const intentIds = new Set(
    executionRows.map((row) => String(row.intent_id ?? "")).filter(Boolean)
  );
  const { data: linkedIntents } = intentIds.size
    ? await supabase
        .from("intent_requests")
        .select("*")
        .in("id", [...intentIds])
        .order("created_at", { ascending: false })
        .returns<AnyRow[]>()
    : { data: [] as AnyRow[] };
  const normalizedPassportName = String(selectedPassport?.subject_name ?? "")
    .trim()
    .toLowerCase();
  const linkedAutonomyProfiles = normalizedPassportName
    ? (autonomyProfiles ?? []).filter(
        (profile) =>
          String(profile.subject_name ?? "").trim().toLowerCase() ===
          normalizedPassportName
      )
    : [];

  const passportNodes: GraphNode[] = selectedPassport
    ? [
        {
          id: selectedPassport.id,
          type: "Passport",
          title: passportLabel(selectedPassport),
          status:
            selectedPassport.verification_status ??
            selectedPassport.review_status ??
            "active",
          createdAt: selectedPassport.created_at,
          href: `/passports/${encodeURIComponent(selectedPassport.id)}`,
        },
      ]
    : [];
  const caseNodes = cases.map((row) => ({
    id: String(row.id),
    type: "Verification Case",
    title: fieldValue(row.subject_name, "Verification case"),
    status: statusValue(row),
    createdAt: row.created_at,
  }));
  const evidenceNodes = evidence.map((row) => ({
    id: String(row.id),
    type: "Evidence",
    title: fieldValue(row.file_name ?? row.file_url, "Evidence file"),
    status: statusValue(row),
    createdAt: row.created_at,
    href: row.public_url ?? row.file_url ?? row.evidence_url,
  }));
  const decisionNodes = decisions.map((row) => ({
    id: String(row.id),
    type: "Decision",
    title: fieldValue(row.decision, "Decision recorded"),
    status: statusValue(row),
    createdAt: row.created_at,
  }));
  const auditNodes = linkedAuditLogs.map((row) => ({
    id: String(row.id),
    type: "Audit Log",
    title: fieldValue(row.event_type, "Audit event"),
    status: row.actor,
    createdAt: row.created_at,
  }));
  const signalNodes = linkedSignals.map((row) => ({
    id: String(row.id),
    type: "Signal",
    title: fieldValue(row.event, "Signal"),
    status: statusValue(row),
    createdAt: row.created_at,
    href: "/signals",
  }));
  const intentNodes = (linkedIntents ?? []).map((row) => ({
    id: String(row.id),
    type: "Intent Request",
    title: fieldValue(row.intent_summary, "Intent request"),
    status: statusValue(row),
    createdAt: row.created_at,
    href: "/intent-verification",
  }));
  const autonomyNodes = linkedAutonomyProfiles.map((row) => ({
    id: String(row.id),
    type: "Autonomy Profile",
    title: fieldValue(row.subject_name, "Autonomy profile"),
    status: row.autonomy_level ?? row.status,
    createdAt: row.created_at,
    href: "/autonomy-governance",
  }));
  const stateNodes = (stateChecks ?? []).map((row) => ({
    id: String(row.id),
    type: "State Check",
    title: fieldValue(row.trust_state, "State check"),
    status: row.risk_movement ?? row.identity_state,
    createdAt: row.created_at,
    href: "/state-verification",
  }));
  const executionNodes = executionRows.map((row) => ({
    id: String(row.id),
    type: "Execution Passport",
    title: fieldValue(row.execution_summary, "Execution request"),
    status: statusValue(row),
    createdAt: row.created_at,
    href: "/execution-passports",
  }));

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Graph
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Trust Graph Explorer&trade;
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                Cyber Sentinels maps the relationships between identity,
                evidence, intent, decisions, signals and audit history.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                Trust is a graph, not a checkbox.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/passports"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                View Trust Passports
              </Link>
              <Link
                href="/back-office"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                Open Back Office
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Graph Summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Live relationship surface across governed trust infrastructure.
              </h2>
            </div>
            {metricsUnavailable ? (
              <p className="text-sm text-amber-200">Some live metrics unavailable.</p>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {metrics.map((metric) => (
              <div
                key={metric.table}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {metric.label}
                </p>
                <p className="mt-4 text-3xl font-semibold text-zinc-100">
                  {metric.available ? metric.count : "n/a"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Passport Selector
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Select the passport relationship graph.
              </h2>
            </div>
            <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" method="get">
              <select
                name="passport_id"
                defaultValue={selectedPassportId}
                className="min-w-0 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white"
              >
                {passportRows.map((passport) => (
                  <option key={passport.id} value={passport.id}>
                    {passportLabel(passport)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                Load Graph
              </button>
            </form>
          </div>
          {selectedPassport ? (
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  Name
                </p>
                <p className="mt-2 font-medium text-zinc-100">
                  {passportLabel(selectedPassport)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  Verification Status
                </p>
                <p className="mt-2 font-medium text-zinc-100">
                  {fieldValue(selectedPassport.verification_status)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  Trust Score
                </p>
                <p className="mt-2 font-medium text-zinc-100">
                  {fieldValue(selectedPassport.trust_score)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  Created
                </p>
                <p className="mt-2 font-medium text-zinc-100">
                  {formatDate(selectedPassport.created_at)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
              No Trust Passports available yet.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Relationship Map
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-6">
            <RelationshipColumn
              title="Passport"
              nodes={passportNodes}
              emptyLabel="No passport selected."
            />
            <RelationshipColumn
              title="Verification Case"
              nodes={caseNodes}
              emptyLabel="No linked verification cases yet."
            />
            <RelationshipColumn
              title="Evidence"
              nodes={evidenceNodes}
              emptyLabel="No linked evidence yet."
            />
            <RelationshipColumn
              title="Decision"
              nodes={decisionNodes}
              emptyLabel="No linked decisions yet."
            />
            <RelationshipColumn
              title="Audit Logs"
              nodes={auditNodes}
              emptyLabel="No linked audit logs yet."
            />
            <RelationshipColumn
              title="Signals"
              nodes={signalNodes}
              emptyLabel="No linked signals yet."
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <RelationshipColumn
              title="Intent Requests"
              nodes={intentNodes}
              emptyLabel="No linked intent requests yet."
            />
            <RelationshipColumn
              title="Autonomy Profiles"
              nodes={autonomyNodes}
              emptyLabel="No linked autonomy profiles yet."
            />
            <RelationshipColumn
              title="State Checks"
              nodes={stateNodes}
              emptyLabel="No linked state checks yet."
            />
            <RelationshipColumn
              title="Execution Passports"
              nodes={executionNodes}
              emptyLabel="No linked execution passports yet."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
