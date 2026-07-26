import {
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustResponse,
  continuousTrustUuid,
  mutationContext,
} from "@/src/lib/continuous-trust/http";
import { transitionContinuousTrustAlert } from "@/src/lib/continuous-trust/alert-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await mutationContext(request, ["owner", "admin", "reviewer"]);
    const alertId = continuousTrustUuid((await context.params).id, "alertId");
    const body = await request.json() as Record<string, unknown>;
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) {
      throw Object.assign(new Error("A dismissal note is required."), { status: 400, code: "DISMISSAL_NOTE_REQUIRED" });
    }
    const alert = await transitionContinuousTrustAlert({
      tenantId: auth.enterpriseId,
      alertId,
      actorId: auth.user.id,
      status: "dismissed",
      note,
      correlationId,
    });
    return continuousTrustResponse({ ok: true, alert }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
