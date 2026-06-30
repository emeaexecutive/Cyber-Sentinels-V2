import { authenticatedTrustClient, apiError, apiSuccess, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";
import { buildTrustTransparencyReport } from "@/lib/trust-transparency";

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
    const transparency = buildTrustTransparencyReport(trust);
    return apiSuccess({
      replay,
      canonicalEvidence: {
        chronology: trust.chronology,
        evidenceContinuity: trust.evidenceContinuity,
        governanceLineage: trust.governanceLineage,
        trustPosture: trust.posture,
        providerEvidence: trust.providerEvidence,
        receipts: trust.receipts,
      },
      explainability: {
        whatChanged: transparency.decisionExplanation.whatChanged,
        whyTrustShifted: transparency.decisionExplanation.whyTrustShifted,
        evidenceReferences: transparency.decisionExplanation.evidenceContributed,
        reviewerActions: transparency.decisionExplanation.governanceActions,
        escalationPath: transparency.auditability.escalationPath,
        policyAndAuthorizationLineage: transparency.auditability.authorizationLineage,
        providerSignals: transparency.decisionExplanation.providerSignals,
      },
      auditBoundary: transparency.boundary,
    });
  } catch {
    return apiError("Replay chronology could not be loaded.", 500);
  }
}
