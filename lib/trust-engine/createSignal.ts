import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSignal(
  supabase: SupabaseClient,
  event: string,
  metadata: Record<string, unknown> = {}
) {
  const result = await supabase.from("signals").insert({ event, metadata });

  if (result.error) {
    console.warn("Signal insert failed", result.error);
  }

  return result;
}
