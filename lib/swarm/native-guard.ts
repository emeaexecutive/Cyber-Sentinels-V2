import type { SwarmContainment } from "./containment.ts";
import type { EnforcementRequest } from "../operational-entities/native-enforcement.ts";

/** Both callbacks run in the existing native boundary, before any tool adapter call. */
export function swarmNativeGuard(control: SwarmContainment, tenantId: string, proof: string) {
  const leases = new Map<string, string>();
  return {
    async admit(request: EnforcementRequest) {
      const result = await control.admit(tenantId, proof, request);
      if (result.allowed) leases.set(request.requestId, result.leaseId);
      return { allowed: result.allowed, reasonCodes: result.reasons, receiptDigest: result.receipt.digest };
    },
    async dispatch(request: EnforcementRequest) {
      const lease = leases.get(request.requestId);
      if (!lease) return { allowed: false, reasonCodes: ["SWARM_LEASE_MISSING"] };
      const result = await control.dispatch(tenantId, proof, request, lease);
      return { allowed: result.allowed, reasonCodes: result.allowed ? [] : ["SWARM_DISPATCH_DENIED"], receiptDigest: result.receipt.digest };
    },
  };
}
