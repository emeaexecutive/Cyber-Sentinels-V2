import { authenticatedTrustClient, apiError, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  if (!validReference(id)) return apiError("Invalid workflow reference.", 400);
  const subjectType = new URL(request.url).searchParams.get("subject_type") ?? undefined;

  try {
    return Response.json(await loadWorkflowTrust(auth.supabase, id, subjectType));
  } catch {
    return apiError("Workflow trust history could not be loaded.", 500);
  }
}

