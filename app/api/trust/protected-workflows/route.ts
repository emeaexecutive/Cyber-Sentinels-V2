import { continuousTrustCorrelationId, continuousTrustFailure, continuousTrustResponse, mutationContext } from "@/src/lib/continuous-trust/http";
import { protectedWorkflowService } from "@/lib/protected-workflows/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await mutationContext(request, ["owner", "admin", "reviewer"]);
    const body = await request.json().catch(() => null);
    const workflow = await protectedWorkflowService({ supabase: auth.supabase, user: auth.user, workspaceId: auth.enterpriseId }).create(body);
    return continuousTrustResponse({ ok: true, workflow }, 201, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
