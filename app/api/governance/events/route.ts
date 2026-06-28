import { authenticatedTrustClient, apiError, validReference } from "@/lib/operational-trust/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  if (!validReference(workflowId)) return apiError("A valid workflow_id is required.", 400);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);

  const { data, error } = await auth.supabase
    .from("governance_actions")
    .select("id,subject_type,subject_id,action_status,assigned_to,resolution_notes,resolved_at,created_at")
    .eq("subject_id", workflowId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return apiError("Governance events could not be loaded.", 500);

  return Response.json({
    workflowReference: workflowId,
    humanReviewRemainsAuthoritative: true,
    events: data ?? [],
  });
}

