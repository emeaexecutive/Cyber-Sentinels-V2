import { hashCanonical, deterministicUuid } from "../trust-core/hash.ts";
import { resolveTrustPolicy } from "./policy-resolution.ts";

export function simulatePolicyResolution(input:Parameters<typeof resolveTrustPolicy>[0]){const resolved=resolveTrustPolicy(input);const simulationHash=hashCanonical({input,resolved});return {simulationId:deterministicUuid({simulationHash}),simulationHash,resolved,mutatesProduction:false as const};}
