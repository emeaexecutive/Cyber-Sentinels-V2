import Link from "next/link";
import { checkUsageLimit } from "@/lib/billing/checkUsageLimit";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeStoredRelationship,
  relationshipLabel,
  type TrustRelationshipView,
} from "@/lib/trust-relationships/relationships";
import {
  buildTrustGraph,
  graphEdgesForNode,
  graphNodesByType,
  type AuditLogGraphRow,
  type DecisionGraphRow,
  type EvidenceFileGraphRow,
  type GraphNode,
  type GraphNodeType,
  type PassportGraphRow,
  type SignalGraphRow,
  type TrustReportGraphRow,
  type VerificationCaseGraphRow,
} from "@/lib/trust-engine/graph";
import { evaluateTrustFabric } from "@/lib/trust-engine/trustFabric";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AnyRow = Record<string, any>;

const nodeStyles: Record<GraphNodeType, string> = {
  human: "border-emerald-800 text-emerald-200",
  candidate: "border-cyan-800 text-cyan-200",
  ai_agent: "border-violet-800 text-violet-200",
  company: "border-zinc-700 text-zinc-200",
  passport: "border-emerald-800 text-emerald-200",
  reality_passport: "border-teal-800 text-teal-200",
  linkedin_profile: "border-blue-800 text-blue-200",
  evidence: "border-amber-800 text-amber-200",
  signal: "border-rose-800 text-rose-200",
  audit_log: "border-zinc-700 text-zinc-300",
  decision: "border-orange-800 text-orange-200",
  origin_trace: "border-sky-800 text-sky-200",
  human_presence_index: "border-lime-800 text-lime-200",
};

async function fetchRows<T>(
  supabase: SupabaseServerClient,
  table: string,
  select: string,
  limit = 16
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  return error ? [] : data ?? [];
}

function NodeCard({ node, edgeCount }: { node: GraphNode; edgeCount: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">{node.label}</p>
          <p className="mt-2 text-sm text-zinc-500">{node.detail}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${nodeStyles[node.type]}`}>
          {node.type}
        </span>
      </div>
      <p className="mt-3 text-xs text-zinc-600">{edgeCount} relationship links</p>
    </div>
  );
}

function GraphSection({
  title,
  nodes,
  edgeCounts,
}: {
  title: string;
  nodes: GraphNode[];
  edgeCounts: Map<string, number>;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-3">
        {nodes.length ? (
          nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              edgeCount={edgeCounts.get(node.id) ?? 0}
            />
          ))
        ) : (
          <p className="text-sm text-zinc-500">No nodes yet.</p>
        )}
      </div>
    </section>
  );
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function RelationshipCard({ relationship }: { relationship: TrustRelationshipView }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">
            {relationship.source_label}{" "}
            <span className="text-teal-200">
              {relationshipLabel(relationship.relationship_type).toLowerCase()}
            </span>{" "}
            {relationship.target_label}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {relationship.explanation}
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
          {relationship.confidence_level}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
        <p>Created by: {relationship.created_by}</p>
        <p>Triggered by: {relationship.trigger}</p>
        <p>Recorded: {formatDate(relationship.created_at)}</p>
      </div>
    </div>
  );
}

export default async function TrustGraphPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usageLimit = await checkUsageLimit(supabase, user, "trust_graph");

  if (!usageLimit.ok) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Graph
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            Trust graph access is available on Pro and Enterprise.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Free access includes a basic Trust Passport view. Upgrade to Pro to
            use graph visibility across evidence, review, signals and audit
            history.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              View Pricing
            </Link>
            <Link
              href="/login?next=/trust-graph"
              className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-cyan-500"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [
    passports,
    trustReports,
    signals,
    auditLogs,
    decisions,
    verificationCases,
    evidenceFiles,
    relationshipRows,
  ] = await Promise.all([
    fetchRows<PassportGraphRow>(
      supabase,
      "passports",
      "id,subject_name,subject_type,trust_score,human_presence_index,origin_trace_score,linkedin_url,linkedin_claimed_company,linkedin_claimed_role"
    ),
    fetchRows<TrustReportGraphRow>(
      supabase,
      "trust_reports",
      "id,candidate_name,linkedin_url,linkedin_claimed_company,linkedin_claimed_role"
    ),
    fetchRows<SignalGraphRow>(supabase, "signals", "id,event"),
    fetchRows<AuditLogGraphRow>(supabase, "audit_logs", "id,event_type,actor"),
    fetchRows<DecisionGraphRow>(
      supabase,
      "decisions",
      "id,verification_case_id,decision,actor"
    ),
    fetchRows<VerificationCaseGraphRow>(
      supabase,
      "verification_cases",
      "id,subject_name,subject_type,status"
    ),
    fetchRows<EvidenceFileGraphRow>(
      supabase,
      "evidence_files",
      "id,verification_case_id,file_name,media_type"
    ),
    fetchRows<AnyRow>(
      supabase,
      "trust_relationships",
      "id,source_type,source_id,relationship_type,target_type,target_id,confidence_level,explanation,created_at",
      48
    ),
  ]);

  const graph = buildTrustGraph({
    passports,
    trustReports,
    signals,
    auditLogs,
    decisions,
    verificationCases,
    evidenceFiles,
  });
  const trustFabric = evaluateTrustFabric({
    active_nodes: graph.nodes.length,
    signals: signals.length,
    decisions: decisions.length,
    evidence: evidenceFiles.length,
    relationships: graph.edges.length,
    global_activity: graph.nodes.length + graph.edges.length,
  });
  const edgeCounts = new Map(
    graph.nodes.map((node) => [node.id, graphEdgesForNode(graph, node.id).length])
  );
  const storedRelationships = relationshipRows.map(normalizeStoredRelationship);
  const relationshipTypeCounts = storedRelationships.reduce<Record<string, number>>(
    (counts, relationship) => {
      counts[relationship.relationship_type] = (counts[relationship.relationship_type] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /
          </Link>
          <Link href="/command-center" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /command-center
          </Link>
          <Link href="/back-office" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Back Office
          </Link>
          <Link href="/trust-fabric" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /trust-fabric
          </Link>
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.28em] text-teal-200">
            Explainable relationships, not graph chaos.
          </p>
          <h1 className="mt-4 text-5xl font-semibold md:text-7xl">
            Trust Graph Explorer
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            V1 uses PostgreSQL relationship records and existing operational
            activity to show verification chains, evidence linkage, agent
            ownership and signal context. AI may summarize these relationships
            later, but it does not invent them.
          </p>
        </section>

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            ["Nodes", graph.nodes.length],
            ["Edges", graph.edges.length],
            ["Relationship Records", storedRelationships.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Explainable Relationship Registry</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                Each relationship names its source, target, confidence,
                explanation, recorder and trigger so governance review stays
                inspectable.
              </p>
            </div>
            <Link
              href="/trust-graph-engine"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Graph Engine
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Evidence Linkage", relationshipTypeCounts.submitted_evidence ?? 0],
              ["Signal Relationships", relationshipTypeCounts.generated_signal ?? 0],
              ["Agent Ownership", relationshipTypeCounts.owned_by ?? 0],
              [
                "Governance Links",
                (relationshipTypeCounts.reviewed_by ?? 0) +
                  (relationshipTypeCounts.verified_by ?? 0),
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {storedRelationships.length ? (
              storedRelationships.map((relationship) => (
                <RelationshipCard key={relationship.id} relationship={relationship} />
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No stored relationship records yet. Passport and agent pages can
                still derive explainable relationships from evidence, audit
                logs, decisions, signals and activity.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Fabric Connection</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Graph nodes and edges feed the connective fabric used by
                Reality OS, Prediction and Mission Control.
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
              ["Fabric Nodes", trustFabric.active_nodes],
              ["Fabric Relationships", trustFabric.relationships],
              ["Fabric Signals", trustFabric.signals],
              ["Fabric Health", trustFabric.health],
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

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Relationship Map</h2>
          <div className="mt-5 grid gap-3">
            {graph.edges.length ? (
              graph.edges.slice(0, 24).map((edge) => {
                const from = graph.nodes.find((node) => node.id === edge.from);
                const to = graph.nodes.find((node) => node.id === edge.to);

                return (
                  <div
                    key={edge.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-400"
                  >
                    <span className="text-zinc-100">{from?.label ?? edge.from}</span>{" "}
                    <span className="text-teal-200">{edge.label}</span>{" "}
                    <span className="text-zinc-100">{to?.label ?? edge.to}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500">No relationships yet.</p>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <GraphSection
            title="Core Identity Node"
            nodes={graphNodesByType(graph, ["human", "candidate", "company"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="Connected Evidence"
            nodes={graphNodesByType(graph, ["passport", "reality_passport", "evidence"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="Active Signals"
            nodes={graphNodesByType(graph, ["signal", "audit_log"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="Decisions"
            nodes={graphNodesByType(graph, ["decision"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="Origin / Provenance Links"
            nodes={graphNodesByType(graph, ["origin_trace"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="Human Presence Links"
            nodes={graphNodesByType(graph, ["human_presence_index"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="LinkedIn / Professional Signals"
            nodes={graphNodesByType(graph, ["linkedin_profile"])}
            edgeCounts={edgeCounts}
          />
          <GraphSection
            title="AI Agent Links"
            nodes={graphNodesByType(graph, ["ai_agent"])}
            edgeCounts={edgeCounts}
          />
        </div>
      </div>
    </main>
  );
}
