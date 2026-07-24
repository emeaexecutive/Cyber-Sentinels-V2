import {
  trustCentreContext,
  trustCentreCorrelationId,
  trustCentreFailure,
  trustCentreResponse,
} from "@/src/lib/trust-centre/http";
import { enterpriseTrustCentreRepository } from "@/src/lib/trust-centre/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = trustCentreCorrelationId(request);
  try {
    const auth = await trustCentreContext(request);
    const workspace = await auth.supabase
      .from("trust_workspaces")
      .select("name")
      .eq("id", auth.enterpriseId)
      .maybeSingle();
    if (workspace.error) throw workspace.error;
    const value = Number(new URL(request.url).searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(value) ? Math.min(200, Math.max(20, value)) : 100;
    const snapshot = await enterpriseTrustCentreRepository().snapshot(
      auth.enterpriseId,
      String(workspace.data?.name ?? "Enterprise workspace"),
      auth.trustCentreRole,
      limit
    );
    return trustCentreResponse({ ok: true, snapshot }, 200, correlationId);
  } catch (error) {
    return trustCentreFailure(error, correlationId);
  }
}
