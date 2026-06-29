import {
  authenticatedTrustClient,
  apiError,
  apiSuccess,
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { buildTrustTransparencyReport } from "@/lib/trust-transparency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
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
    const report = buildTrustTransparencyReport(trust);
    return apiSuccess({
      workflow: report.workflow,
      scoringMethod: report.scoringMethod,
      whatChanged: report.decisionExplanation.whatChanged,
      whyTrustShifted: report.decisionExplanation.whyTrustShifted,
      evidenceContributed: report.decisionExplanation.evidenceContributed,
      governanceActions: report.decisionExplanation.governanceActions,
      providerSignals: report.decisionExplanation.providerSignals,
      replayReference: report.auditability.replayReference,
      authorizationLineage: report.auditability.authorizationLineage,
      posture: report.posture,
      boundary: report.boundary,
    });
  } catch {
    return apiError("Trust explanation could not be loaded.", 500);
  }
}
