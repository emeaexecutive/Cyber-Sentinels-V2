import "server-only";

import {
  architectureContext,
  architectureCorrelationId,
  architectureFailure,
  architectureResponse,
  assertArchitectureMutation,
  TrustArchitectureApiError,
} from "@/src/lib/trust-architecture/http";
import { enterpriseTrustCentreRole, hasTrustCentreCapability } from "./permissions";
import type { TrustCentreCapability } from "./types";

export {
  architectureCorrelationId as trustCentreCorrelationId,
  architectureFailure as trustCentreFailure,
  architectureResponse as trustCentreResponse,
};

export async function trustCentreContext(
  request: Request,
  capability: TrustCentreCapability = "read",
  mutation = false
) {
  if (mutation) assertArchitectureMutation(request);
  const context = await architectureContext(request);
  const role = enterpriseTrustCentreRole(
    context.role,
    context.user.app_metadata?.trust_centre_role
  );
  if (!hasTrustCentreCapability(role, capability)) {
    throw new TrustArchitectureApiError(
      "This enterprise role cannot perform the requested Trust Centre action.",
      403,
      "TRUST_CENTRE_ROLE_DENIED"
    );
  }
  return { ...context, trustCentreRole: role };
}
