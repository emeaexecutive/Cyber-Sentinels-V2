import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { reviewedOutcomesToTrustMemoryEvents } from "@/lib/governance/reviewed-outcomes";
import { createClient } from "@/lib/supabase/server";
import { loadValidationCases, runValidationBenchmark } from "@/lib/validation/benchmark-harness";
import { buildTrustMemorySnapshot } from "@/lib/trust-memory/trust-memory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(request, supabase);

  if (!access.ok) return access.response;

  const cases = await loadValidationCases();
  const benchmark = await runValidationBenchmark({ cases });
  const reviewedEvents = reviewedOutcomesToTrustMemoryEvents(benchmark.reviewedOutcomes);
  const snapshot = buildTrustMemorySnapshot(reviewedEvents);

  return NextResponse.json(
    {
      ok: true,
      recentTrustMemoryEvents: snapshot.events.slice(0, 25).map((event) => ({
        id: event.id,
        actor_id: event.actor_id,
        actor_type: event.actor_type,
        workflow_id: event.workflow_id,
        event_kind: event.event_kind,
        trust_state_before: event.trust_state_before,
        trust_state_after: event.trust_state_after,
        trust_delta: event.trust_delta,
        trust_change: event.trust_change,
        reason: event.reason,
        evidence_count: event.evidence_refs.length,
        replay_refs: event.replay_refs,
        governance_refs: event.governance_refs,
        provider_refs: event.provider_refs,
        reviewed_outcome_ref: event.reviewed_outcome_ref,
        confidence_before: event.confidence_before,
        confidence_after: event.confidence_after,
        explanation: event.explanation,
        created_at: event.created_at,
      })),
      trustEvolutionSummaries: snapshot.summaries,
      confidenceChanges: snapshot.events.slice(0, 25).map((event) => ({
        event_id: event.id,
        before: event.confidence_before,
        after: event.confidence_after,
        delta: event.trust_delta,
      })),
      reviewedOutcomeImpact: {
        reviewedOutcomeEvents: snapshot.events.filter((event) => event.reviewed_outcome_ref).length,
        falsePositiveEvents: snapshot.events.filter((event) => event.event_kind === "false_positive_outcome").length,
        falseNegativeEvents: snapshot.events.filter((event) => event.event_kind === "false_negative_outcome").length,
        boundary: "Reviewed outcomes can adjust future confidence; this endpoint does not expose raw sensitive evidence.",
      },
      replayLinks: [...new Set(snapshot.events.flatMap((event) => event.replay_refs))],
      evidenceLinks: snapshot.events.map((event) => ({
        event_id: event.id,
        evidence_count: event.evidence_refs.length,
      })),
      boundary: snapshot.boundary,
      generated_at: snapshot.generated_at,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
