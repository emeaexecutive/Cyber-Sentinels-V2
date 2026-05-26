import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSignal(
  supabase: SupabaseClient,
  event: string
) {
  const result = await supabase.from("signals").insert({ event });

  if (result.error) {
    console.warn("Signal insert failed", result.error);
  }

  return result;
}
