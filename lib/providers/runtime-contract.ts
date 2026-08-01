import type { ProviderRuntimeState } from "@/src/lib/trust-fabric/types";

export function canonicalProviderRuntimeState(input:{configured:boolean;usesMockData:boolean;safeFailure:boolean;runtimeState:string;healthState?:string|null;hasContradiction?:boolean}):ProviderRuntimeState{
  if(input.hasContradiction||/invalid|signature|contradict/i.test(String(input.healthState??"")))return "contradicted";
  if(/live|production/i.test(input.runtimeState)&&input.configured&&!input.usesMockData)return "available";
  if(/degraded|timeout|failed|test|simulated|configured/i.test(input.runtimeState)&&input.configured)return "degraded";
  if(/disabled|awaiting|unavailable/i.test(input.runtimeState)||!input.safeFailure)return "unavailable";
  return "unknown";
}
