import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSignal(
  supabase: SupabaseClient,
  event: string
) {
  return supabase.from("signals").insert({ event });
}
