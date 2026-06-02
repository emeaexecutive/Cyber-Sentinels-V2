import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { scoreGraphHealth } from "@/lib/trust-graph/scoreGraphHealth";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type TrustGraphEnginePageProps = {
  searchParams?: Promise<{ passport_id?: string; generated?: string }>;
};

type PassportOption = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  verification_status: string | null;
  trust_score: number | null;
  created_at: string | null;
};

type MetricResult = {
  table: string;
  label: string;
  count: number;
  available: boolean;
};

type GraphNodeInsert = {
  node_type: string;
  source_table: string;
  source_id: string;
  label: string;
  status: string | null;
  risk_level: string | null;
  metadata: Record<string, unknown>;
};

const metricTables = [
  ["passports", "Passports"],
  ["evidence_files", "Evidence Files"],
  ["decisions", "Decisions"],
  ["signals", "Signals"],
  ["audit_logs", "Audit Events"],
  ["trust_graph_nodes", "Graph Nodes"],
  ["trust_graph_edges", "Graph Edges"],
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

function rowDate(row: AnyRow) {
  return String(row.created_at ?? row.updated_at ?? "");
}

function sortNewestFirst(rows: AnyRow[]) {
  return [...rows].sort(
    (left, right) =>
      new Date(rowDate(right)).getTime() - new Date(rowDate(left)).getTime()
  );
}

function isRelatedEvent(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const rowMetadata = metadata(row);
  const metadataPassportId = String(rowMetadata.passport_id ?? "");
  const metadataCaseId = String(rowMetadata.verification_case_id ?? "");
  const rowPassportId = String(row.passport_id ?? "");
  const rowCaseId = String(row.verification_case_id ?? row.case_id ?? "");

  return (
    metadataPassportId === passportId ||
    (metadataCaseId ? caseIds.has(metadataCaseId) : false) ||
    rowPassportId === passportId ||
    (rowCaseId ? caseIds.has(rowCaseId) : false)
  );
}

function relatedId(row: AnyRow, field: string) {
  return metadata(row)[field] ?? row[field] ?? null;
}

function eventMatchesDecision(row: AnyRow, decisionId: string) {
  const metadataDecisionId = relatedId(row, "decision_id");

  return metadataDecisionId ? String(metadataDecisionId) === decisionId : true;
}

function statusValue(row: AnyRow) {
  return (
    row.status ??
    row.verification_status ??
    row.review_status ??
    row.scan_status ??
    row.risk_level ??
    null
  );
}

function nodeKey(sourceTable: string, sourceId: unknown) {
  return `${sourceTable}:${String(sourceId)}`;
}

function nodeFromRow(
  nodeType: string,
  sourceTable: string,
  row: AnyRow,
  label: string,
  passportId: string,
  snapshotId: string
): GraphNodeInsert {
  return {
    node_type: nodeType,
    source_table: sourceTable,
    source_id: String(row.id),
    label,
    status: statusValue(row),
    risk_level: row.risk_level ?? null,
    metadata: {
      passport_id: passportId,
      verification_case_id: relatedId(row, "verification_case_id"),
      evidence_id: sourceTable === "evidence_files" ? row.id : relatedId(row, "evidence_id"),
      decision_id: sourceTable === "decisions" ? row.id : relatedId(row, "decision_id"),
      intent_id: relatedId(row, "intent_id"),
      autonomy_profile_id: relatedId(row, "autonomy_profile_id"),
      execution_passport_id:
        sourceTable === "execution_passports"
          ? row.id
          : relatedId(row, "execution_passport_id"),
      state_check_id:
        sourceTable === "passport_state_checks"
          ? row.id
          : relatedId(row, "state_check_id"),
      actor: relatedId(row, "actor"),
      snapshot_id: snapshotId,
    },
  };
}

async function generateGraphSnapshot(formData: FormData) {
  "use server";

  const passportId = String(formData.get("passport_id") ?? "").trim();

  if (!passportId) {
    redirect("/trust-graph-engine");
  }

  const supabase = await createClient();
  const user = await requireAdminPageAccess(supabase, {
    path: "/trust-graph-engine",
    action: "generate_graph_snapshot",
    passport_id: passportId,
  });
  const actor = user.email ?? user.id;

  const { data: passport } = await supabase
    .from("passports")
    .select("*")
    .eq("id", passportId)
    .maybeSingle();

  if (!passport) {
    redirect("/trust-graph-engine");
  }

  const snapshotId = crypto.randomUUID();
  const [
    { data: cases },
    { data: passportEvidence },
    { data: passportDecisions },
    { data: auditRows },
    { data: signalRows },
    { data: stateChecks },
    { data: executionPassports },
  ] = await Promise.all([
    supabase
      .from("verification_cases")
      .select("*")
      .eq("passport_id", passportId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AnyRow[]>(),
    supabase
      .from("evidence_files")
      .select("*")
      .eq("passport_id", passportId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AnyRow[]>(),
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", passportId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AnyRow[]>(),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AnyRow[]>(),
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AnyRow[]>(),
    supabase
      .from("passport_state_checks")
      .select("*")
      .eq("passport_id", passportId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AnyRow[]>(),
    supabase
      .from("execution_passports")
      .select("*")
      .eq("passport_id", passportId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AnyRow[]>(),
  ]);

  const caseRows = cases ?? [];
  const caseIds = new Set(caseRows.map((item) => String(item.id)));
  const [{ data: caseEvidence }, { data: caseDecisions }] = caseIds.size
    ? await Promise.all([
        supabase
          .from("evidence_files")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
        supabase
          .from("decisions")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
      ])
    : [{ data: [] as AnyRow[] }, { data: [] as AnyRow[] }];

  const evidenceById = new Map<string, AnyRow>();
  [...(passportEvidence ?? []), ...(caseEvidence ?? [])].forEach((row) => {
    evidenceById.set(String(row.id), row);
  });
  const decisionById = new Map<string, AnyRow>();
  [...(passportDecisions ?? []), ...(caseDecisions ?? [])].forEach((row) => {
    decisionById.set(String(row.id), row);
  });

  const evidenceRows = sortNewestFirst([...evidenceById.values()]);
  const decisionRows = sortNewestFirst([...decisionById.values()]);
  const relatedAuditLogs = sortNewestFirst(
    (auditRows ?? []).filter((row) => isRelatedEvent(row, passportId, caseIds))
  );
  const relatedSignals = sortNewestFirst(
    (signalRows ?? []).filter((row) => isRelatedEvent(row, passportId, caseIds))
  );

  const nodes: GraphNodeInsert[] = [
    nodeFromRow(
      "passport",
      "passports",
      passport,
      fieldValue(passport.subject_name, "Trust Passport"),
      passportId,
      snapshotId
    ),
    ...caseRows.map((row) =>
      nodeFromRow(
        "verification_case",
        "verification_cases",
        row,
        fieldValue(row.subject_name, "Verification Case"),
        passportId,
        snapshotId
      )
    ),
    ...evidenceRows.map((row) =>
      nodeFromRow(
        "evidence_file",
        "evidence_files",
        row,
        fieldValue(row.file_name ?? row.file_url, "Evidence File"),
        passportId,
        snapshotId
      )
    ),
    ...decisionRows.map((row) =>
      nodeFromRow(
        "decision",
        "decisions",
        row,
        fieldValue(row.decision, "Decision"),
        passportId,
        snapshotId
      )
    ),
    ...relatedAuditLogs.map((row) =>
      nodeFromRow(
        "audit_log",
        "audit_logs",
        row,
        fieldValue(row.event_type, "Audit Event"),
        passportId,
        snapshotId
      )
    ),
    ...relatedSignals.map((row) =>
      nodeFromRow(
        "signal",
        "signals",
        row,
        fieldValue(row.event, "Signal"),
        passportId,
        snapshotId
      )
    ),
    ...(stateChecks ?? []).map((row) =>
      nodeFromRow(
        "state_check",
        "passport_state_checks",
        row,
        fieldValue(row.trust_state, "State Check"),
        passportId,
        snapshotId
      )
    ),
    ...(executionPassports ?? []).map((row) =>
      nodeFromRow(
        "execution_passport",
        "execution_passports",
        row,
        fieldValue(row.execution_summary, "Execution Passport"),
        passportId,
        snapshotId
      )
    ),
  ];

  const { data: insertedNodes, error } = await supabase
    .from("trust_graph_nodes")
    .insert(nodes)
    .select("id,source_table,source_id,node_type")
    .returns<AnyRow[]>();

  if (error || !insertedNodes) {
    redirect(`/trust-graph-engine?passport_id=${encodeURIComponent(passportId)}`);
  }

  const nodeIds = new Map(
    insertedNodes.map((node) => [
      nodeKey(String(node.source_table), node.source_id),
      String(node.id),
    ])
  );
  const passportNodeId = nodeIds.get(nodeKey("passports", passportId));
  const edges: AnyRow[] = [];
  const addEdge = (
    fromKey: string,
    toKey: string,
    relationshipType: string,
    sourceTable: string,
    sourceId: unknown
  ) => {
    const fromNodeId = nodeIds.get(fromKey);
    const toNodeId = nodeIds.get(toKey);

    if (!fromNodeId || !toNodeId) {
      return;
    }

    edges.push({
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      relationship_type: relationshipType,
      source_table: sourceTable,
      source_id: String(sourceId),
    metadata: {
      passport_id: passportId,
      verification_case_id: sourceTable === "verification_cases" ? sourceId : null,
      evidence_id: sourceTable === "evidence_files" ? sourceId : null,
      decision_id: sourceTable === "decisions" ? sourceId : null,
      execution_passport_id:
        sourceTable === "execution_passports" ? sourceId : null,
      state_check_id: sourceTable === "passport_state_checks" ? sourceId : null,
      actor,
      snapshot_id: snapshotId,
    },
  });
  };

  if (passportNodeId) {
    caseRows.forEach((row) =>
      addEdge(
        nodeKey("passports", passportId),
        nodeKey("verification_cases", row.id),
        "passport_has_verification_case",
        "verification_cases",
        row.id
      )
    );
    (stateChecks ?? []).forEach((row) =>
      addEdge(
        nodeKey("passports", passportId),
        nodeKey("passport_state_checks", row.id),
        "passport_has_state_check",
        "passport_state_checks",
        row.id
      )
    );
    (executionPassports ?? []).forEach((row) =>
      addEdge(
        nodeKey("passports", passportId),
        nodeKey("execution_passports", row.id),
        "passport_has_execution_passport",
        "execution_passports",
        row.id
      )
    );
  }

  evidenceRows.forEach((row) => {
    const caseId = row.verification_case_id ? String(row.verification_case_id) : "";
    const parentKey = caseId
      ? nodeKey("verification_cases", caseId)
      : nodeKey("passports", passportId);

    addEdge(
      parentKey,
      nodeKey("evidence_files", row.id),
      "verification_case_has_evidence",
      "evidence_files",
      row.id
    );
  });
  decisionRows.forEach((row) => {
    const caseId = row.verification_case_id ?? row.case_id;
    const parentKey = caseId
      ? nodeKey("verification_cases", caseId)
      : nodeKey("passports", passportId);

    addEdge(
      parentKey,
      nodeKey("decisions", row.id),
      "verification_case_has_decision",
      "decisions",
      row.id
    );
  });
  decisionRows.forEach((decision) => {
    relatedAuditLogs.forEach((log) =>
      eventMatchesDecision(log, String(decision.id))
        ? addEdge(
            nodeKey("decisions", decision.id),
            nodeKey("audit_logs", log.id),
            "decision_generated_audit",
            "audit_logs",
            log.id
          )
        : null
    );
    relatedSignals.forEach((signal) =>
      eventMatchesDecision(signal, String(decision.id))
        ? addEdge(
            nodeKey("decisions", decision.id),
            nodeKey("signals", signal.id),
            "decision_generated_signal",
            "signals",
            signal.id
          )
        : null
    );
  });

  if (edges.length) {
    await supabase.from("trust_graph_edges").insert(edges);
  }

  const snapshotMetadata = {
    passport_id: passportId,
    actor,
    snapshot_id: snapshotId,
  };

  await createAuditLog(
    supabase,
    "trust_graph_snapshot_created",
    actor,
    snapshotMetadata
  );
  await createSignal(
    supabase,
    "Trust graph snapshot created",
    snapshotMetadata
  );

  redirect(
    `/trust-graph-engine?passport_id=${encodeURIComponent(passportId)}&generated=1`
  );
}

function StatusChip({ value }: { value?: unknown }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
      {fieldValue(value, "linked")}
    </span>
  );
}

function NodeCard({ node }: { node: AnyRow }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
            {fieldValue(node.node_type)}
          </p>
          <p className="mt-2 font-medium text-zinc-100">
            {fieldValue(node.label)}
          </p>
        </div>
        <StatusChip value={node.status ?? node.risk_level} />
      </div>
      <p className="mt-3 text-xs text-zinc-600">{formatDate(node.created_at)}</p>
    </div>
  );
}

function NodeGroup({
  title,
  nodes,
  emptyLabel,
}: {
  title: string;
  nodes: AnyRow[];
  emptyLabel: string;
}) {
  return (
    <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="absolute -left-4 top-1/2 hidden h-px w-4 bg-cyan-900/70 lg:block" />
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-4 grid gap-3">
        {nodes.length ? (
          nodes.map((node) => <NodeCard key={String(node.id)} node={node} />)
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function TrustGraphEnginePage({
  searchParams,
}: TrustGraphEnginePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, {
    path: "/trust-graph-engine",
    passport_id: params?.passport_id,
  });

  const [metrics, { data: passports }] = await Promise.all([
    Promise.all(metricTables.map(([table, label]) => liveCount(table, label))),
    supabase
      .from("passports")
      .select("id,subject_name,subject_type,verification_status,trust_score,created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<PassportOption[]>(),
  ]);
  const passportRows = passports ?? [];
  const selectedPassport =
    passportRows.find((passport) => passport.id === params?.passport_id) ??
    passportRows[0];
  const selectedPassportId = selectedPassport?.id ?? "";
  const metricsUnavailable = metrics.some((metric) => !metric.available);

  const { data: allNodes } = selectedPassportId
    ? await supabase
        .from("trust_graph_nodes")
        .select("*")
        .contains("metadata", { passport_id: selectedPassportId })
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<AnyRow[]>()
    : { data: [] as AnyRow[] };
  const latestSnapshotId = String(metadata((allNodes ?? [])[0] ?? {}).snapshot_id ?? "");
  const graphNodes = latestSnapshotId
    ? (allNodes ?? []).filter(
        (node) => String(metadata(node).snapshot_id ?? "") === latestSnapshotId
      )
    : [];
  const { data: graphEdges } = latestSnapshotId
    ? await supabase
        .from("trust_graph_edges")
        .select("*")
        .contains("metadata", { snapshot_id: latestSnapshotId })
        .order("created_at", { ascending: false })
        .limit(300)
        .returns<AnyRow[]>()
    : { data: [] as AnyRow[] };

  const [
    { data: selectedCases },
    { data: selectedPassportEvidence },
    { data: selectedPassportDecisions },
    { data: selectedAuditRows },
    { data: selectedSignalRows },
    { data: selectedStateChecks },
    { data: selectedExecutionPassports },
  ] = selectedPassportId
    ? await Promise.all([
        supabase
          .from("verification_cases")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
        supabase
          .from("evidence_files")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
        supabase
          .from("decisions")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<AnyRow[]>(),
        supabase
          .from("signals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<AnyRow[]>(),
        supabase
          .from("passport_state_checks")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
        supabase
          .from("execution_passports")
          .select("*")
          .eq("passport_id", selectedPassportId)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<AnyRow[]>(),
      ])
    : [
        { data: [] as AnyRow[] },
        { data: [] as AnyRow[] },
        { data: [] as AnyRow[] },
        { data: [] as AnyRow[] },
        { data: [] as AnyRow[] },
        { data: [] as AnyRow[] },
        { data: [] as AnyRow[] },
      ];
  const selectedCaseRows = selectedCases ?? [];
  const selectedCaseIds = new Set(selectedCaseRows.map((item) => String(item.id)));
  const [{ data: selectedCaseEvidence }, { data: selectedCaseDecisions }] =
    selectedCaseIds.size
      ? await Promise.all([
          supabase
            .from("evidence_files")
            .select("*")
            .in("verification_case_id", [...selectedCaseIds])
            .order("created_at", { ascending: false })
            .limit(50)
            .returns<AnyRow[]>(),
          supabase
            .from("decisions")
            .select("*")
            .in("verification_case_id", [...selectedCaseIds])
            .order("created_at", { ascending: false })
            .limit(50)
            .returns<AnyRow[]>(),
        ])
      : [{ data: [] as AnyRow[] }, { data: [] as AnyRow[] }];
  const selectedEvidenceById = new Map<string, AnyRow>();
  [...(selectedPassportEvidence ?? []), ...(selectedCaseEvidence ?? [])].forEach(
    (row) => selectedEvidenceById.set(String(row.id), row)
  );
  const selectedDecisionById = new Map<string, AnyRow>();
  [...(selectedPassportDecisions ?? []), ...(selectedCaseDecisions ?? [])].forEach(
    (row) => selectedDecisionById.set(String(row.id), row)
  );
  const selectedEvidence = sortNewestFirst([...selectedEvidenceById.values()]);
  const selectedDecisions = sortNewestFirst([...selectedDecisionById.values()]);
  const selectedAuditLogs = sortNewestFirst(
    (selectedAuditRows ?? []).filter((row) =>
      isRelatedEvent(row, selectedPassportId, selectedCaseIds)
    )
  );
  const selectedSubjectName = String(selectedPassport?.subject_name ?? "")
    .trim()
    .toLowerCase();
  const selectedSignals = sortNewestFirst(
    (selectedSignalRows ?? []).filter(
      (row) =>
        isRelatedEvent(row, selectedPassportId, selectedCaseIds) ||
        (selectedSubjectName
          ? String(row.event ?? "").toLowerCase().includes(selectedSubjectName)
          : false)
    )
  );
  const graphHealth = scoreGraphHealth({
    passport: selectedPassport ?? null,
    verificationCases: selectedCaseRows,
    evidenceFiles: selectedEvidence,
    decisions: selectedDecisions,
    auditLogs: selectedAuditLogs,
    signals: selectedSignals,
    stateChecks: selectedStateChecks ?? [],
    executionPassports: selectedExecutionPassports ?? [],
    graphNodes,
    graphEdges: graphEdges ?? [],
  });

  const nodesByType = (type: string) =>
    graphNodes.filter((node) => node.node_type === type);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Graph Engine
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Trust Graph Engine&trade;
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                Map the relationships between identity, evidence, intent,
                decisions, signals and audit history.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                Trust is a graph, not a checkbox.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Graph Overview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Live source data and generated graph structure.
              </h2>
            </div>
            {metricsUnavailable ? (
              <p className="text-sm text-amber-200">Some live metrics unavailable.</p>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
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
                Passport Graph Builder
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Generate a readable graph snapshot from real linked records.
              </h2>
            </div>
            <form action={generateGraphSnapshot} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                name="passport_id"
                defaultValue={selectedPassportId}
                required
                className="min-w-0 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white"
              >
                {passportRows.map((passport) => (
                  <option key={passport.id} value={passport.id}>
                    {fieldValue(passport.subject_name, "Unnamed passport")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                Generate Graph Snapshot
              </button>
            </form>
          </div>
          {params?.generated === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              Graph snapshot generated.
            </p>
          ) : null}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Graph Intelligence Summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {graphHealth.label}
              </h2>
            </div>
            <span className="rounded-full border border-cyan-800 bg-cyan-950/20 px-3 py-1 text-sm text-cyan-100">
              {graphHealth.score}/100
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {[
              ["Total Nodes", graphHealth.totalNodes],
              ["Total Edges", graphHealth.totalEdges],
              ["Evidence Coverage", graphHealth.evidenceCoverage],
              ["Decision Coverage", graphHealth.decisionCoverage],
              ["Audit Coverage", graphHealth.auditCoverage],
              ["Signal Density", graphHealth.signalDensity],
              ["Completeness", graphHealth.score],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-zinc-100">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h3 className="font-semibold text-zinc-100">Missing Links</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {graphHealth.missingLinks.length ? (
                  graphHealth.missingLinks.map((warning) => (
                    <span
                      key={warning}
                      className="rounded-full border border-amber-800 bg-amber-950/20 px-2.5 py-1 text-xs text-amber-200"
                    >
                      {warning}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-emerald-800 bg-emerald-950/20 px-2.5 py-1 text-xs text-emerald-200">
                    No missing links detected
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h3 className="font-semibold text-zinc-100">Graph Explainability</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {graphHealth.explanation}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Graph Relationship Timeline
          </p>
          <div className="mt-5 space-y-3">
            {graphHealth.timeline.length ? (
              graphHealth.timeline.map((event, index) => (
                <div
                  key={`${event.label}-${index}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{event.label}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No graph timeline events available yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Structured Graph View
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Passport to evidence, decisions, audit and signals.
              </h2>
            </div>
            {latestSnapshotId ? (
              <span className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                {graphNodes.length} nodes / {(graphEdges ?? []).length} edges
              </span>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-6">
            <NodeGroup
              title="Passport"
              nodes={nodesByType("passport")}
              emptyLabel="Generate a graph snapshot to see the passport node."
            />
            <NodeGroup
              title="Verification Case"
              nodes={nodesByType("verification_case")}
              emptyLabel="No linked verification cases yet."
            />
            <NodeGroup
              title="Evidence"
              nodes={nodesByType("evidence_file")}
              emptyLabel="No linked evidence yet."
            />
            <NodeGroup
              title="Decision"
              nodes={nodesByType("decision")}
              emptyLabel="No linked decisions yet."
            />
            <NodeGroup
              title="Audit"
              nodes={nodesByType("audit_log")}
              emptyLabel="No linked audit logs yet."
            />
            <NodeGroup
              title="Signal"
              nodes={nodesByType("signal")}
              emptyLabel="No linked signals yet."
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <NodeGroup
              title="State Checks"
              nodes={nodesByType("state_check")}
              emptyLabel="No linked state checks yet."
            />
            <NodeGroup
              title="Execution Passports"
              nodes={nodesByType("execution_passport")}
              emptyLabel="No linked execution passports yet."
            />
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm leading-6 text-zinc-400">
            Advanced interactive graph engine planned: expandable nodes, risk
            propagation, relationship tracing and investigation mode.
          </p>
        </section>
      </div>
    </main>
  );
}
