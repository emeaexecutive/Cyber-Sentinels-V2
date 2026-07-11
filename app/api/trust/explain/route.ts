import {
  authenticatedTrustClient,
  apiError,
  apiSuccess,
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { replayEngine } from "@/lib/core/replay-engine";
import { buildDecisionIntelligence } from "@/lib/core/decision-intelligence";
import { buildEvidenceGraph, buildEvidenceGraphDemo } from "@/lib/evidence-graph/evidence-graph";
import {
  buildDemoTrustExplanation,
  buildTrustExplanation,
} from "@/lib/trust-explanation/explanation";
import { buildProviderReadinessChecklist } from "@/lib/providers/provider-readiness";
import { reviewedOutcomesToTrustMemoryEvents } from "@/lib/governance/reviewed-outcomes";
import { loadValidationCases, runValidationBenchmark } from "@/lib/validation/benchmark-harness";
import type { ReplaySession } from "@/lib/trust-replay/replay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  if (url.searchParams.get("demo") === "1") {
    const graph = buildEvidenceGraphDemo();
    const explanation = buildDemoTrustExplanation(graph);
    return apiSuccess({
      explanation,
      decisionIntelligence: buildDecisionIntelligence({
        explanation,
        providerReadiness: buildProviderReadinessChecklist(),
      }),
      graph,
    });
  }
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  const subjectType = url.searchParams.get("subject_type") ?? undefined;
  if (!validReference(workflowId)) {
    return apiError("A valid workflow_id is required.", 400);
  }

  try {
    const trust = await loadWorkflowTrust(
      auth.supabase,
      workflowId,
      subjectType
    );
    const { report } = replayEngine.buildReplayTransparencyReport(trust);
    const cases = await loadValidationCases().catch(() => []);
    const benchmark = await runValidationBenchmark({ cases }).catch(() => null);
    const reviewedOutcomes = benchmark?.reviewedOutcomes ?? [];
    const trustMemoryEvents = reviewedOutcomesToTrustMemoryEvents(reviewedOutcomes);
    const replaySessions: ReplaySession[] = trust.replay.sessions.map((session: any) => ({
      id: String(session.id),
      subject_type: session.subject_type ?? null,
      subject_id: session.subject_id ?? null,
      replay_summary: session.replay_summary ?? null,
      generated_by: session.generated_by ?? null,
      created_at: session.created_at ?? null,
    }));
    const graph = buildEvidenceGraph({
      workflows: [{ id: trust.workflow.subjectId, workflow_type: trust.workflow.subjectType }],
      evidence: trust.evidenceContinuity,
      replaySessions,
      governanceReviews: trust.governanceLineage,
      trustMemoryEvents,
      providerSignals: trust.providerEvidence.providers.map((provider: any) => ({
        providerId: provider.providerId,
        providerName: provider.providerName,
        sourceType: "workflow_context",
        identityConfidence: 70,
        sessionIntegrity: 70,
        providerVerificationState: provider.verificationState,
        riskFlags: [],
        governanceRecommendation: "Use provider evidence as review context.",
        evidenceReferences: provider.evidenceReferences,
        summary: provider.summary,
      })),
    });
    const latestGovernance = trust.governanceLineage.at(-1);
    const decision =
      String(latestGovernance?.action_status ?? "").toLowerCase().includes("block")
        ? "BLOCK"
        : trust.posture.state === "governance_review"
          ? "ESCALATE"
          : trust.governanceLineage.length
            ? "REVIEW"
            : "ALLOW";
    const explanation = buildTrustExplanation({
      workflow: report.workflow,
      decision,
      reason: report.decisionExplanation.whyTrustShifted,
      confidence: 0.7,
      evidence: report.decisionExplanation.evidenceContributed,
      providers: report.decisionExplanation.providerSignals,
      runtimeSignals: trust.chronology.map((row: any) => String(row.event_summary ?? row.event_type ?? "Runtime signal recorded")).slice(0, 12),
      governancePolicy: {
        policyId: String(latestGovernance?.policy_id ?? "workflow-governance-policy"),
        policyName: "Workflow governance policy",
        outcome: String(latestGovernance?.action_status ?? "not recorded"),
        rationale: String(latestGovernance?.resolution_notes ?? trust.explanation.governanceImpact),
      },
      reviewedOutcomes,
      trustMemoryEvents,
      evidenceGraph: graph,
      replayReference: report.auditability.replayReference,
      transparencyReport: report,
    });
    const decisionIntelligence = buildDecisionIntelligence({
      explanation,
      providerReadiness: buildProviderReadinessChecklist(),
      reviewedOutcomes,
      trustMemoryEvents,
    });
    return apiSuccess({
      explanation,
      decisionIntelligence,
      workflow: report.workflow,
      scoringMethod: report.scoringMethod,
      whatChanged: report.decisionExplanation.whatChanged,
      whyTrustShifted: report.decisionExplanation.whyTrustShifted,
      evidenceContributed: report.decisionExplanation.evidenceContributed,
      governanceActions: report.decisionExplanation.governanceActions,
      providerSignals: report.decisionExplanation.providerSignals,
      replayReference: report.auditability.replayReference,
      authorizationLineage: report.auditability.authorizationLineage,
      evidenceGraphRelationships: explanation.evidenceGraphRelationships,
      trustMemoryEvents: explanation.trustMemoryEvents,
      reviewedOutcomes: explanation.reviewedOutcomes,
      timeline: explanation.timeline,
      decisionTimeline: decisionIntelligence.timeline,
      posture: report.posture,
      boundary: report.boundary,
    });
  } catch {
    return apiError("Trust explanation could not be loaded.", 500);
  }
}
