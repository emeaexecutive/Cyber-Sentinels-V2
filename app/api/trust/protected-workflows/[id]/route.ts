import { continuousTrustContext, continuousTrustCorrelationId, continuousTrustFailure, continuousTrustResponse } from "@/src/lib/continuous-trust/http";
import { protectedWorkflowService } from "@/lib/protected-workflows/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const [auth, { id }] = await Promise.all([continuousTrustContext(request), context.params]);
    const result = await protectedWorkflowService({ supabase: auth.supabase, user: auth.user, workspaceId: auth.enterpriseId }).get(id);
    return continuousTrustResponse({ ok: true, ...result }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
