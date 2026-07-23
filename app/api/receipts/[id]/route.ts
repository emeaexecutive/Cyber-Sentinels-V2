import { authenticatedTrustClient, apiError, apiSuccess, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";
import { buildPortableTrustEvidence, verifyReceiptContinuity } from "@/lib/trust-receipts/verification";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  if (!validReference(id)) return apiError("Invalid receipt reference.", 400);

  const { data: receipt } = await auth.supabase.from("verification_receipts").select(
    "id,subject_type,subject_id,receipt_type,verification_status,confidence_level,issued_by,issued_at,expires_at,receipt_summary,evidence_snapshot"
  ).eq("id", id).maybeSingle();
  if (!receipt) return apiError("Receipt not found or access is not permitted.", 404);

  try {
    const trust = await loadWorkflowTrust(auth.supabase, String(receipt.subject_id), receipt.subject_type ?? undefined);
    const verification = verifyReceiptContinuity({
      receipt,
      timeline: trust.chronology,
      evidenceChains: trust.evidenceContinuity,
      governanceActions: trust.governanceLineage,
      replaySessions: trust.replay.sessions,
    });
    const portableEvidence = buildPortableTrustEvidence({
      receiptId: receipt.id,
      subjectType: receipt.subject_type,
      subjectId: receipt.subject_id,
      providerSignalCount: trust.providerEvidence.providers.length,
      trustPosture: trust.posture.label,
      governanceOutcome: trust.governanceLineage.at(-1)?.action_status ?? "No intervention recorded",
      authorizationRelationshipCount: trust.governanceLineage.length,
      issuedAt: receipt.issued_at,
      replayReference: trust.replay.sessions.length ? trust.replay.reference : null,
    });
    const safeReceipt = { ...receipt };
    delete safeReceipt.evidence_snapshot;
    return apiSuccess({
      receipt: safeReceipt,
      portableEvidence,
      integrity: verification,
      providerEvidence: trust.providerEvidence,
      governanceLineage: trust.governanceLineage,
      replayReference: trust.replay.sessions.length ? trust.replay.reference : null,
    });
  } catch {
    return apiError("Receipt evidence could not be loaded.", 500);
  }
}
