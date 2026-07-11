import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionSummary } from "@/components/executive-summary";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { buildEvidenceGraph, buildEvidenceGraphDemo, type EvidenceGraphNodeType } from "@/lib/evidence-graph/evidence-graph";
import { runEvidenceGraphQueries } from "@/lib/evidence-graph/query";
import { reviewedOutcomesToTrustMemoryEvents } from "@/lib/governance/reviewed-outcomes";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import type { ReplaySession } from "@/lib/trust-replay/replay";
import { loadValidationCases, runValidationBenchmark } from "@/lib/validation/benchmark-harness";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function replayRows(rows: Row[]): ReplaySession[] {
  return rows.map((row) => ({
    id: String(row.id),
    subject_type: row.subject_type ?? null,
    subject_id: row.subject_id ?? null,
    replay_summary: row.replay_summary ?? null,
    generated_by: row.generated_by ?? null,
    created_at: row.created_at ?? null,
  }));
}

const filterOptions: Array<[string, string, EvidenceGraphNodeType | "all"]> = [
  ["All", "All", "all"],
  ["Human", "Human", "human"],
  ["AI Agent", "AI Agent", "ai_agent"],
  ["Machine Identity", "Machine Identity", "machine_identity"],
  ["Workflow", "Workflow", "workflow"],
  ["Evidence", "Evidence", "evidence"],
  ["Trust Memory", "Trust Memory", "trust_memory_event"],
  ["Replay", "Replay", "replay_event"],
  ["Governance", "Governance", "governance_review"],
];

async function rows(
  supabase: SupabaseClient,
  table: string,
  fields = "*",
  limit = 80,
  orderColumn = "created_at"
) {
  const { data, error } = await supabase
    .from(table)
    .select(fields)
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<Row[]>();

  return error ? [] : data ?? [];
}

function stateClass(answer: string) {
  return answer === "YES"
    ? "border-emerald-800 bg-emerald-950/20 text-emerald-200"
    : "border-amber-800 bg-amber-950/20 text-amber-200";
}

export default async function AdminEvidenceGraphPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; demo?: string }>;
}) {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/evidence-graph");
    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/evidence-graph" });

  const params = await searchParams;
  const filter = (params?.filter ?? "all") as EvidenceGraphNodeType | "all";
  const showDemo = params?.demo === "1";

  const [agents, receipts, replaySessions, governanceReviews, validationCases] = await Promise.all([
    rows(supabase, "ai_agents", "id,name,owner_email,owner_user_id,model_provider,model_name,status,created_at", 60),
    rows(supabase, "verification_receipts", "id,subject_type,subject_id,receipt_type,verification_status,confidence_level,receipt_summary,evidence_snapshot,issued_at", 80, "issued_at"),
    rows(supabase, "trust_replay_sessions", "id,subject_type,subject_id,replay_summary,generated_by,created_at", 80),
    rows(supabase, "governance_actions", "id,subject_type,subject_id,action_status,assigned_to,resolution_notes,resolved_at,created_at", 80),
    loadValidationCases().catch(() => []),
  ]);
  const benchmark = await runValidationBenchmark({ cases: validationCases }).catch(() => null);
  const graph = showDemo
    ? buildEvidenceGraphDemo()
    : buildEvidenceGraph({
        aiAgents: agents,
        workflows: receipts.map((receipt) => ({
          id: receipt.subject_id,
          workflow_type: receipt.subject_type,
          created_at: receipt.issued_at,
        })),
        evidence: receipts,
        replaySessions: replayRows(replaySessions),
        governanceReviews,
        trustMemoryEvents: benchmark ? reviewedOutcomesToTrustMemoryEvents(benchmark.reviewedOutcomes) : [],
        providerSignals: receipts.flatMap((receipt) =>
          buildWorkflowProviderSignals({
            evidenceSnapshot: receipt.evidence_snapshot ?? {},
            providerVerificationState: receipt.verification_status,
            evidenceReferences: [`verification_receipt:${receipt.id}`],
          })
        ),
        validationResults: benchmark?.results.map((result) => ({ ...result, id: result.caseId })) ?? [],
      });
  const queries = runEvidenceGraphQueries(graph);
  const visibleNodes = filter === "all" ? graph.nodes : graph.nodes.filter((node) => node.type === filter);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleRelationships =
    filter === "all"
      ? graph.relationships
      : graph.relationships.filter((edge) => visibleNodeIds.has(edge.from) || visibleNodeIds.has(edge.to));
  const demoStory = buildEvidenceGraphDemo();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Evidence Graph Alpha</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold md:text-5xl">
                Explain why this was trusted.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                The Evidence Graph connects identities, AI agents, workflows, evidence, provider signals, replay, governance and Trust Memory into one admin-only relationship model.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${stateClass(queries.explainTrust.answer)}`}>
              CISO answer: {queries.explainTrust.answer}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/api/evidence-graph" className="brand-secondary-action">API</Link>
            <Link href="/admin/evidence-graph?demo=1" className="brand-secondary-action">Demo Story</Link>
            <Link href="/admin/deployment-readiness" className="brand-secondary-action">Readiness</Link>
          </div>
        </section>

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: queries.explainTrust.answer === "YES" ? "Decision relationships are explainable" : "Relationship evidence is incomplete" },
            { label: "Current risks", value: queries.explainTrust.answer === "YES" ? "No graph-level blocker identified" : "Missing relationship evidence requires review" },
            { label: "Recommended action", value: queries.explainTrust.answer === "YES" ? "Review the shortest evidence path" : "Attach missing evidence or governance context" },
            { label: "Evidence available", value: `${graph.nodes.filter((node) => node.type === "evidence").length} evidence node(s); ${visibleRelationships.length} visible relationship(s)` },
            { label: "Confidence", value: "Relationship confidence is source-specific, not an authenticity score" },
            { label: "Responsible owner", value: "Trust operations reviewer" },
          ]} />
        </div>

        <section className="mt-6 flex flex-wrap gap-2">
          {filterOptions.map(([label, text, value]) => (
            <Link
              key={value}
              href={`/admin/evidence-graph?filter=${value}${showDemo ? "&demo=1" : ""}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${filter === value ? "border-cyan-500 text-cyan-100" : "border-zinc-800 text-zinc-400 hover:text-white"}`}
            >
              {text}
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["Nodes", visibleNodes.length],
            ["Relationships", visibleRelationships.length],
            ["Evidence", graph.nodes.filter((node) => node.type === "evidence").length],
            ["Governance", graph.nodes.filter((node) => node.type === "governance_review").length],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value)}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Enterprise Graph</h2>
            <div className="mt-5 grid gap-3">
              {visibleNodes.slice(0, 10).map((node) => (
                <article key={node.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{node.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cyan-200">{node.type.replaceAll("_", " ")}</p>
                    </div>
                    <span className="text-xs text-zinc-600">{visibleRelationships.filter((edge) => edge.from === node.id || edge.to === node.id).length} edge(s)</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{node.summary}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Why Trusted</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{queries.explainTrust.explanation}</p>
            <div className="mt-5 grid gap-3">
              {visibleRelationships.slice(0, 8).map((edge) => {
                const from = graph.nodes.find((node) => node.id === edge.from);
                const to = graph.nodes.find((node) => node.id === edge.to);
                return (
                  <div key={edge.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-zinc-200">
                      {from?.label ?? edge.from} <span className="text-cyan-200">{edge.type}</span> {to?.label ?? edge.to}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {edge.source} / confidence {Math.round(edge.confidence * 100)}% / replay {edge.replayReference ?? "not linked"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Demo: Human to Decision</h2>
          <div className="mt-5 grid gap-2 md:grid-cols-8">
            {["People", "AI Agents", "Machine Identities", "Workflows", "Evidence", "Governance", "Trust Memory\u2122", "Outcome"].map((step, index) => (
              <div key={step} className="rounded-lg border border-zinc-800 bg-black p-3">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-zinc-500">
            Demo graph: {demoStory.nodes.length} nodes and {demoStory.relationships.length} relationships. This story is deterministic and contains no customer data.
          </p>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-600">{graph.boundary}</p>
      </div>
    </main>
  );
}
