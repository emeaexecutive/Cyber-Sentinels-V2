import { authenticatedTrustClient, apiError, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  if (!validReference(id)) return apiError("Invalid replay reference.", 400);

  const { data: replay } = await auth.supabase
    .from("trust_replay_sessions")
    .select("id,subject_type,subject_id,replay_summary,generated_by,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!replay) return apiError("Replay not found or access is not permitted.", 404);

  try {
    const trust = await loadWorkflowTrust(auth.supabase, String(replay.subject_id), replay.subject_type ?? undefined);
    return Response.json({
      replay,
      canonicalEvidence: {
        chronology: trust.chronology,
        evidenceContinuity: trust.evidenceContinuity,
        governanceLineage: trust.governanceLineage,
        trustPosture: trust.posture,
        providerEvidence: trust.providerEvidence,
        receipts: trust.receipts,
      },
    });
  } catch {
    return apiError("Replay chronology could not be loaded.", 500);
  }
}

