import { authenticatedTrustClient, apiError, apiSuccess, validReference } from "@/lib/operational-trust/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  if (!validReference(workflowId)) return apiError("A valid workflow_id is required.", 400);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 50;

  const { data, error } = await auth.supabase
    .from("governance_actions")
    .select("id,subject_type,subject_id,action_status,assigned_to,resolution_notes,resolved_at,created_at")
    .eq("subject_id", workflowId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return apiError("Governance events could not be loaded.", 500);

  return apiSuccess({
    workflowReference: workflowId,
    humanReviewRemainsAuthoritative: true,
    governanceContinuity: "replay_linked",
    events: (data ?? []).map((event) => ({
      ...event,
      reviewerAttribution: event.assigned_to ?? "Reviewer not assigned",
      escalationOwner: event.assigned_to ?? "Owner not assigned",
      resolutionSummary:
        event.resolution_notes ?? "Resolution pending or not recorded",
      evidenceReference: `governance:${event.id}`,
      replayReference: `/trust-replay?subject_type=${encodeURIComponent(
        event.subject_type ?? "workflow"
      )}&subject_id=${encodeURIComponent(event.subject_id ?? workflowId)}`,
    })),
  });
}
