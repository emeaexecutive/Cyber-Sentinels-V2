import { ReplayService } from "@/src/core/trust/replay";
import { replaySearch } from "@/src/core/trust/replay/http";
import { createReplayRepository } from "@/src/core/trust/replay/supabase-repository";
import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
  trustGraphUuid,
} from "@/src/core/trust/graph/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request);
    const entityId = trustGraphUuid((await context.params).id, "entityId");
    const timeline = await new ReplayService(
      createReplayRepository(auth.supabase),
    ).timeline(auth.enterpriseId, entityId, replaySearch(request));
    return trustGraphResponse({ ok: true, timeline }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
