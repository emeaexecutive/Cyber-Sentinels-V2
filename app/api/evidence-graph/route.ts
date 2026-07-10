import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { buildEvidenceGraph, buildEvidenceGraphDemo } from "@/lib/evidence-graph/evidence-graph";
import { runEvidenceGraphQueries } from "@/lib/evidence-graph/query";
import { createClient } from "@/lib/supabase/server";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import type { ReplaySession } from "@/lib/trust-replay/replay";
import { reviewedOutcomesToTrustMemoryEvents } from "@/lib/governance/reviewed-outcomes";
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const target = url.searchParams.get("target") ?? undefined;
  const demoOnly = url.searchParams.get("demo") === "1";

  const demo = buildEvidenceGraphDemo();
  if (demoOnly) {
    return NextResponse.json(
      { ok: true, graph: demo, queries: runEvidenceGraphQueries(demo, target) },
      { headers: { "cache-control": "no-store" } }
    );
  }

  const [agents, receipts, replaySessions, governanceReviews, validationCases] = await Promise.all([
    rows(supabase, "ai_agents", "id,name,owner_email,owner_user_id,model_provider,model_name,status,created_at", 60),
    rows(supabase, "verification_receipts", "id,subject_type,subject_id,receipt_type,verification_status,confidence_level,receipt_summary,evidence_snapshot,issued_at", 80, "issued_at"),
    rows(supabase, "trust_replay_sessions", "id,subject_type,subject_id,replay_summary,generated_by,created_at", 80),
    rows(supabase, "governance_actions", "id,subject_type,subject_id,action_status,assigned_to,resolution_notes,resolved_at,created_at", 80),
    loadValidationCases().catch(() => []),
  ]);

  const benchmark = await runValidationBenchmark({ cases: validationCases }).catch(() => null);
  const trustMemoryEvents = benchmark
    ? reviewedOutcomesToTrustMemoryEvents(benchmark.reviewedOutcomes)
    : [];
  const providerSignals = receipts.flatMap((receipt) =>
    buildWorkflowProviderSignals({
      evidenceSnapshot: receipt.evidence_snapshot ?? {},
      providerVerificationState: receipt.verification_status,
      evidenceReferences: [`verification_receipt:${receipt.id}`],
    })
  );
  const validationResults = benchmark?.results.map((result) => ({
    ...result,
    id: result.caseId,
    confidence: result.confidence,
  })) ?? [];

  const graph = buildEvidenceGraph({
    aiAgents: agents,
    workflows: receipts.map((receipt) => ({
      id: receipt.subject_id,
      workflow_type: receipt.subject_type,
      created_at: receipt.issued_at,
    })),
    evidence: receipts,
    replaySessions: replayRows(replaySessions),
    governanceReviews,
    trustMemoryEvents,
    providerSignals,
    validationResults,
  });

  return NextResponse.json(
    {
      ok: true,
      graph,
      queries: runEvidenceGraphQueries(graph, target),
      demo,
      safety: {
        adminProtected: true,
        rawProviderPayloadsExcluded: true,
        secretsExcluded: true,
      },
    },
    { headers: { "cache-control": "no-store" } }
  );
}
