import {
  trustCentreContext,
  trustCentreCorrelationId,
  trustCentreFailure,
  trustCentreResponse,
} from "@/src/lib/trust-centre/http";
import { enterpriseTrustCentreRepository } from "@/src/lib/trust-centre/repository";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stateActions = ["acknowledge", "investigating", "resolved", "dismissed"];

export async function POST(request: Request) {
  const correlationId = trustCentreCorrelationId(request);
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "").trim().toLowerCase();
    const capability =
      action === "assign" ? "assign" : action === "comment" ? "comment" : "triage";
    const auth = await trustCentreContext(request, capability, true);
    if (![...stateActions, "assign", "comment"].includes(action)) {
      throw Object.assign(new Error("Alert action is unsupported."), {
        status: 400,
        code: "ALERT_ACTION_INVALID",
      });
    }
    const alertIds = Array.isArray(body.alertIds)
      ? [...new Set(body.alertIds.map(String))]
      : [];
    if (!alertIds.length || alertIds.length > 100 || alertIds.some((id) => !uuid.test(id))) {
      throw Object.assign(new Error("Provide 1 to 100 valid alert IDs."), {
        status: 400,
        code: "ALERT_IDS_INVALID",
      });
    }
    const note = String(body.note ?? "").trim().slice(0, 500);
    if ((action === "comment" || ["resolved", "dismissed"].includes(action)) && !note) {
      throw Object.assign(new Error("A note is required for this alert action."), {
        status: 400,
        code: "ALERT_NOTE_REQUIRED",
      });
    }
    const assignedTo =
      typeof body.assignedTo === "string" && uuid.test(body.assignedTo)
        ? body.assignedTo
        : null;
    if (action === "assign" && !assignedTo) {
      throw Object.assign(new Error("A valid assignee is required."), {
        status: 400,
        code: "ALERT_ASSIGNEE_INVALID",
      });
    }
    const result = await enterpriseTrustCentreRepository().mutateAlerts({
      enterpriseId: auth.enterpriseId,
      alertIds,
      actorId: auth.user.id,
      action,
      note,
      assignedTo,
      correlationId,
    });
    return trustCentreResponse({ ok: true, result }, 200, correlationId);
  } catch (error) {
    return trustCentreFailure(error, correlationId);
  }
}
