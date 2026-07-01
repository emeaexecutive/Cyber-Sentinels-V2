import { authenticatedTrustClient, apiError, apiSuccess, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";
import { buildTrustTransparencyReport } from "@/lib/trust-transparency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  const subjectType = url.searchParams.get("subject_type") ?? undefined;
  if (!validReference(workflowId)) return apiError("A valid workflow_id is required.", 400);

  try {
    const trust = await loadWorkflowTrust(auth.supabase, workflowId, subjectType);
    const transparency = buildTrustTransparencyReport(trust);
    return apiSuccess({
      supportedSubjectTypes: ["human", "agent", "system"],
      workflow: trust.workflow,
      posture: trust.posture,
      explanation: trust.explanation,
      providerEvidence: trust.providerEvidence,
      replayReference: trust.replay.reference,
      transparency: {
        whatChanged: transparency.decisionExplanation.whatChanged,
        whyTrustShifted: transparency.decisionExplanation.whyTrustShifted,
        evidenceReferences: transparency.decisionExplanation.evidenceContributed,
        governanceActions: transparency.decisionExplanation.governanceActions,
        authorizationLineage: transparency.auditability.authorizationLineage,
      },
      boundary: transparency.boundary,
      postureSemantics: {
        contextShiftAlerts: true,
        governanceReviewState: trust.posture?.state ?? "not_recorded",
        trustRecalculationReason:
          trust.explanation ?? "Posture recalculated from current workflow evidence and governance context.",
        automatedFinalDecision: false,
      },
    });
  } catch {
    return apiError("Trust posture could not be loaded.", 500);
  }
}
