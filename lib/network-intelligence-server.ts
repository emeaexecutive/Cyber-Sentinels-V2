import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { benchmarkSimulationObservations } from "@/lib/benchmarking/records";
import { loadBenchmarkObservations } from "@/lib/benchmarking/server";
import { aggregateNetworkIntelligence } from "@/lib/network-intelligence";

export async function loadNetworkIntelligence(supabase: SupabaseClient) {
  const observations = await loadBenchmarkObservations(supabase);
  return {
    live: aggregateNetworkIntelligence(observations),
    simulation: aggregateNetworkIntelligence(benchmarkSimulationObservations, {
      simulated: true,
    }),
  };
}
