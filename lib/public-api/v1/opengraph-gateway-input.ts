import { PublicApiError, assertOnlyFields, requiredText } from "./contracts";
import { normalizeOpenGraphTarget } from "@/src/lib/opengraph/workflow";

const referencePattern = /^[A-Za-z0-9_.:/@-]{1,240}$/;

export function inspectOpenGraphGatewayInput(body: Record<string, unknown>) {
  assertOnlyFields(body, ["operational_entity_id", "target_url"]);
  const operationalEntityId = requiredText(body.operational_entity_id, "operational_entity_id", 180, referencePattern);
  const rawTarget = requiredText(body.target_url, "target_url", 300);
  try {
    return { operationalEntityId, target: normalizeOpenGraphTarget(rawTarget) };
  } catch {
    throw new PublicApiError("INVALID_OPENGRAPH_TARGET", "The OpenGraph target URL is invalid or outside the supported URL contract.", 400);
  }
}
