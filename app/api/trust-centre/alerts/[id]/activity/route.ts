import {
  trustCentreContext,
  trustCentreCorrelationId,
  trustCentreFailure,
  trustCentreResponse,
} from "@/src/lib/trust-centre/http";
import { enterpriseTrustCentreRepository } from "@/src/lib/trust-centre/repository";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = trustCentreCorrelationId(request);
  try {
    const auth = await trustCentreContext(request);
    const alertId = (await context.params).id;
    if (!uuid.test(alertId)) {
      throw Object.assign(new Error("Alert ID is invalid."), {
        status: 400,
        code: "ALERT_ID_INVALID",
      });
    }
    const activity = await enterpriseTrustCentreRepository().alertActivity(
      auth.enterpriseId,
      alertId
    );
    return trustCentreResponse({ ok: true, activity }, 200, correlationId);
  } catch (error) {
    return trustCentreFailure(error, correlationId);
  }
}
