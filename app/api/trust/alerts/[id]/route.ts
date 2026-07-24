import {
  continuousTrustContext,
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustResponse,
  continuousTrustUuid,
} from "@/src/lib/continuous-trust/http";
import { continuousTrustSignalRepository } from "@/src/lib/continuous-trust/signal-repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await continuousTrustContext(request);
    const alertId = continuousTrustUuid((await context.params).id, "alertId");
    const alert = await continuousTrustSignalRepository().alert(auth.enterpriseId, alertId);
    if (!alert) {
      return continuousTrustResponse({ ok: false, code: "ALERT_NOT_FOUND", error: "Alert was not found." }, 404, correlationId);
    }
    return continuousTrustResponse({ ok: true, alert }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
