import { boundedLimit, continuousTrustContext, continuousTrustCorrelationId, continuousTrustFailure, continuousTrustResponse } from "@/src/lib/continuous-trust/http";
import { alertStates } from "@/src/lib/continuous-trust/types";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { const correlationId = continuousTrustCorrelationId(request); try { const auth = await continuousTrustContext(request); const limit = boundedLimit(request); const status = new URL(request.url).searchParams.get("status"); if (status && !alertStates.includes(status as never)) throw Object.assign(new Error("status is invalid."), { status: 400, code: "ALERT_STATUS_INVALID" }); return continuousTrustResponse({ ok: true, alerts: await continuousTrustRepository().alerts(auth.enterpriseId, limit, status) }, 200, correlationId); } catch (error) { return continuousTrustFailure(error, correlationId); } }
