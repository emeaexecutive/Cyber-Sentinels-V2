import { authenticatedTrustClient, apiError, apiSuccess, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";
import { replayEngine } from "@/lib/core/replay-engine";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  if (!validReference(id)) return apiError("Invalid replay reference.", 400);

  const { data: replay, error: replayError } = await auth.supabase
    .from("trust_replay_sessions")
    .select("id,subject_type,subject_id,replay_summary,generated_by,created_at")
    .eq("id", id)
    .maybeSingle();
  if (replayError) return apiError("Replay lookup could not be completed.", 500);
  if (!replay) return apiError("Replay not found or access is not permitted.", 404);
  if (!replay.subject_id) {
    return apiError("Replay has no workflow subject reference.", 409);
  }

  try {
    const trust = await loadWorkflowTrust(auth.supabase, String(replay.subject_id), replay.subject_type ?? undefined);
    const memory = replayEngine.buildReplayEvidenceMemory(trust);
    return apiSuccess({
      replay,
      entity: {
        type: memory.entity_decision_surface.entity_type,
        authority: memory.entity_decision_surface.authority,
        evidence: memory.entity_decision_surface.evidence,
        trustPosture: memory.entity_decision_surface.trust_posture,
        decision: memory.entity_decision_surface.decision,
        outcome: memory.entity_decision_surface.outcome,
      },
      canonicalEvidence: {
        chronology: memory.chronology,
        evidenceContinuity: memory.evidenceContinuity,
        governanceLineage: memory.governanceLineage,
        trustPosture: memory.trustPosture,
        providerEvidence: memory.providerEvidence,
        receipts: memory.receipts,
      },
      explainability: {
        whatChanged: memory.explainability.whatChanged,
        whyTrustShifted: memory.explainability.whyTrustShifted,
        evidenceReferences: memory.explainability.evidenceContributed,
        reviewerActions: memory.explainability.governanceActions,
        escalationPath: memory.auditability.escalationPath,
        policyAndAuthorizationLineage: memory.auditability.authorizationLineage,
        providerSignals: memory.explainability.providerSignals,
      },
      auditBoundary: memory.auditBoundary,
    });
  } catch {
    return apiError("Replay chronology could not be loaded.", 500);
  }
}
