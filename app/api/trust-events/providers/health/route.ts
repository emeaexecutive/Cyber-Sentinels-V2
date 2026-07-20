import { providerHealthSnapshot } from "@/src/lib/trust-events/provider-registry";
import { trustEventCorrelationId, trustEventFailure, trustEventReadContext, trustEventResponse } from "@/src/lib/trust-events/http";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const correlationId = trustEventCorrelationId(request);
  try { await trustEventReadContext(request); return trustEventResponse({ ok: true, providers: await providerHealthSnapshot() }, 200, correlationId); }
  catch (error) { return trustEventFailure(error, correlationId); }
}
