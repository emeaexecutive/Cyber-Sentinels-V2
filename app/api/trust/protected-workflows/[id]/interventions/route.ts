import { continuousTrustCorrelationId, continuousTrustFailure, continuousTrustResponse, mutationContext } from "@/src/lib/continuous-trust/http";
import { protectedWorkflowService } from "@/lib/protected-workflows/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const [auth, { id }, body] = await Promise.all([mutationContext(request, ["owner", "admin", "reviewer"]), context.params, request.json().catch(() => null)]);
    const result = await protectedWorkflowService({ supabase: auth.supabase, user: auth.user, workspaceId: auth.enterpriseId }).intervene(id, body);
    return continuousTrustResponse({ ok: true, ...result }, result.idempotentReplay ? 200 : 201, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
